from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
import structlog

from app.models.alert import Alert, AlertSeverity, AlertStatus, AlertCategory
from app.schemas.alert import AlertCreate, AlertUpdate, AlertStats

logger = structlog.get_logger(__name__)


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_alert(self, data: AlertCreate) -> Alert:
        alert = Alert(**data.model_dump())
        self.db.add(alert)
        await self.db.flush()
        logger.info("alert_created", alert_id=str(alert.id), severity=alert.severity)
        return alert

    async def get_alert(self, alert_id: UUID) -> Optional[Alert]:
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        return result.scalar_one_or_none()

    async def list_alerts(
        self,
        page: int = 1,
        page_size: int = 25,
        severity: Optional[AlertSeverity] = None,
        status: Optional[AlertStatus] = None,
        category: Optional[AlertCategory] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = select(Alert)
        count_query = select(func.count()).select_from(Alert)

        filters = []
        if severity:
            filters.append(Alert.severity == severity)
        if status:
            filters.append(Alert.status == status)
        if category:
            filters.append(Alert.category == category)
        if search:
            filters.append(Alert.title.ilike(f"%{search}%"))

        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        total = (await self.db.execute(count_query)).scalar()
        offset = (page - 1) * page_size

        result = await self.db.execute(
            query.order_by(
                desc(Alert.created_at)
            ).offset(offset).limit(page_size)
        )
        items = list(result.scalars().all())

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, -(-total // page_size)),
        }

    async def update_alert(self, alert_id: UUID, data: AlertUpdate, user_id: UUID) -> Optional[Alert]:
        update_dict = data.model_dump(exclude_none=True)

        if data.status == AlertStatus.RESOLVED:
            update_dict["resolved_by"] = user_id
            update_dict["resolved_at"] = datetime.now(timezone.utc)

        await self.db.execute(
            update(Alert).where(Alert.id == alert_id).values(**update_dict)
        )
        return await self.get_alert(alert_id)

    async def get_stats(self) -> AlertStats:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        total = (await self.db.execute(select(func.count()).select_from(Alert))).scalar()
        open_count = (await self.db.execute(
            select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.OPEN)
        )).scalar()
        critical = (await self.db.execute(
            select(func.count()).select_from(Alert).where(Alert.severity == AlertSeverity.CRITICAL)
        )).scalar()
        high = (await self.db.execute(
            select(func.count()).select_from(Alert).where(Alert.severity == AlertSeverity.HIGH)
        )).scalar()
        medium = (await self.db.execute(
            select(func.count()).select_from(Alert).where(Alert.severity == AlertSeverity.MEDIUM)
        )).scalar()
        low = (await self.db.execute(
            select(func.count()).select_from(Alert).where(Alert.severity == AlertSeverity.LOW)
        )).scalar()
        resolved_today = (await self.db.execute(
            select(func.count()).select_from(Alert).where(
                and_(Alert.status == AlertStatus.RESOLVED, Alert.resolved_at >= today_start)
            )
        )).scalar()

        # By category
        cat_result = await self.db.execute(
            select(Alert.category, func.count()).group_by(Alert.category)
        )
        by_category = {row[0]: row[1] for row in cat_result.all()}

        return AlertStats(
            total=total,
            open=open_count,
            critical=critical,
            high=high,
            medium=medium,
            low=low,
            resolved_today=resolved_today,
            by_category=by_category,
        )

    async def create_from_rule_match(self, rule_match, source_log_data: Dict) -> Alert:
        """Create an alert from a threat engine rule match."""
        alert_data = AlertCreate(
            title=f"[{rule_match.rule.id}] {rule_match.rule.name}",
            description=rule_match.rule.description,
            severity=rule_match.rule.severity,
            category=rule_match.rule.category,
            source_ip=source_log_data.get("source_ip"),
            destination_ip=source_log_data.get("destination_ip"),
            source_port=source_log_data.get("source_port"),
            destination_port=source_log_data.get("destination_port"),
            rule_id=rule_match.rule.id,
            rule_name=rule_match.rule.name,
            raw_event=source_log_data,
        )
        return await self.create_alert(alert_data)
