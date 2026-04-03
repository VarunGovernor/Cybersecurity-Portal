from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import structlog

from app.models.log import LogEntry, LogLevel, LogSource
from app.schemas.log import LogIngest, LogStats
from app.services.threat_engine import threat_engine

logger = structlog.get_logger(__name__)


class LogService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest_log(self, data: LogIngest) -> LogEntry:
        log_dict = data.model_dump()
        if log_dict.get("timestamp") is None:
            log_dict["timestamp"] = datetime.now(timezone.utc)

        log_entry = LogEntry(**log_dict)
        self.db.add(log_entry)
        await self.db.flush()

        # Run threat detection asynchronously
        matches = threat_engine.evaluate(log_dict)
        return log_entry, matches

    async def ingest_batch(self, logs: List[LogIngest]) -> Dict[str, Any]:
        entries = []
        all_matches = []

        for log_data in logs:
            entry, matches = await self.ingest_log(log_data)
            entries.append(entry)
            all_matches.extend(matches)

        logger.info("batch_ingested", count=len(entries), matches=len(all_matches))
        return {"ingested": len(entries), "alerts_triggered": len(all_matches)}

    async def list_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        level: Optional[LogLevel] = None,
        source: Optional[LogSource] = None,
        source_ip: Optional[str] = None,
        event_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = select(LogEntry)
        count_query = select(func.count()).select_from(LogEntry)

        filters = []
        if level:
            filters.append(LogEntry.level == level)
        if source:
            filters.append(LogEntry.source == source)
        if source_ip:
            filters.append(LogEntry.source_ip == source_ip)
        if event_type:
            filters.append(LogEntry.event_type == event_type)
        if start_time:
            filters.append(LogEntry.timestamp >= start_time)
        if end_time:
            filters.append(LogEntry.timestamp <= end_time)
        if search:
            filters.append(LogEntry.message.ilike(f"%{search}%"))

        if filters:
            from sqlalchemy import and_
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        total = (await self.db.execute(count_query)).scalar()
        offset = (page - 1) * page_size

        result = await self.db.execute(
            query.order_by(desc(LogEntry.timestamp)).offset(offset).limit(page_size)
        )
        items = list(result.scalars().all())

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, -(-total // page_size)),
        }

    async def get_stats(self) -> LogStats:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        total_24h = (await self.db.execute(
            select(func.count()).select_from(LogEntry).where(LogEntry.timestamp >= cutoff)
        )).scalar()

        # By level
        level_result = await self.db.execute(
            select(LogEntry.level, func.count()).where(
                LogEntry.timestamp >= cutoff
            ).group_by(LogEntry.level)
        )
        by_level = {str(row[0]): row[1] for row in level_result.all()}

        # By source
        source_result = await self.db.execute(
            select(LogEntry.source, func.count()).where(
                LogEntry.timestamp >= cutoff
            ).group_by(LogEntry.source)
        )
        by_source = {str(row[0]): row[1] for row in source_result.all()}

        # Events per hour (last 24h)
        hourly_result = await self.db.execute(
            text("""
                SELECT date_trunc('hour', timestamp) as hour, count(*) as count
                FROM log_entries
                WHERE timestamp >= :cutoff
                GROUP BY hour
                ORDER BY hour
            """),
            {"cutoff": cutoff}
        )
        events_per_hour = [
            {"hour": str(row[0]), "count": row[1]}
            for row in hourly_result.all()
        ]

        # Top source IPs
        ip_result = await self.db.execute(
            select(LogEntry.source_ip, func.count().label("count"))
            .where(and_(LogEntry.timestamp >= cutoff, LogEntry.source_ip.isnot(None)))
            .group_by(LogEntry.source_ip)
            .order_by(desc("count"))
            .limit(10)
        )
        top_source_ips = [
            {"ip": row[0], "count": row[1]}
            for row in ip_result.all()
        ]

        return LogStats(
            total_24h=total_24h,
            by_level=by_level,
            by_source=by_source,
            events_per_hour=events_per_hour,
            top_source_ips=top_source_ips,
        )
