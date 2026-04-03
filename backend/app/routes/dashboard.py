from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.log import LogEntry, LogLevel
from app.models.audit import AuditLog
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", summary="Get dashboard summary statistics")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    # Alert counts
    total_alerts = (await db.execute(select(func.count()).select_from(Alert))).scalar()
    open_alerts = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.OPEN)
    )).scalar()
    critical_alerts = (await db.execute(
        select(func.count()).select_from(Alert).where(
            and_(Alert.severity == AlertSeverity.CRITICAL, Alert.status == AlertStatus.OPEN)
        )
    )).scalar()
    new_alerts_24h = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.created_at >= last_24h)
    )).scalar()

    # Log counts
    total_logs_24h = (await db.execute(
        select(func.count()).select_from(LogEntry).where(LogEntry.timestamp >= last_24h)
    )).scalar()
    error_logs_24h = (await db.execute(
        select(func.count()).select_from(LogEntry).where(
            and_(LogEntry.timestamp >= last_24h, LogEntry.level == LogLevel.ERROR)
        )
    )).scalar()

    # Alert trend (last 7 days by day)
    alert_trend = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = (await db.execute(
            select(func.count()).select_from(Alert).where(
                and_(Alert.created_at >= day_start, Alert.created_at < day_end)
            )
        )).scalar()
        alert_trend.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count,
        })

    # Severity breakdown (open alerts)
    severity_breakdown = {}
    for sev in AlertSeverity:
        cnt = (await db.execute(
            select(func.count()).select_from(Alert).where(
                and_(Alert.severity == sev, Alert.status == AlertStatus.OPEN)
            )
        )).scalar()
        severity_breakdown[sev.value] = cnt

    # Log volume by hour (last 24h)
    from sqlalchemy import text
    hourly_result = await db.execute(
        text("""
            SELECT date_trunc('hour', timestamp) as hour,
                   count(*) as total,
                   count(*) FILTER (WHERE level = 'error') as errors,
                   count(*) FILTER (WHERE level = 'warning') as warnings
            FROM log_entries
            WHERE timestamp >= :cutoff
            GROUP BY hour
            ORDER BY hour
        """),
        {"cutoff": last_24h}
    )
    log_volume = [
        {"hour": str(row[0]), "total": row[1], "errors": row[2], "warnings": row[3]}
        for row in hourly_result.all()
    ]

    # Top threat categories
    cat_result = await db.execute(
        select(Alert.category, func.count().label("count"))
        .where(Alert.created_at >= last_7d)
        .group_by(Alert.category)
        .order_by(func.count().desc())
        .limit(6)
    )
    top_categories = [{"category": row[0], "count": row[1]} for row in cat_result.all()]

    # Recent activity
    recent_audits_result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    recent_activity = [
        {
            "action": a.action,
            "user": a.user_email,
            "ip": a.ip_address,
            "time": str(a.created_at),
        }
        for a in recent_audits_result.scalars().all()
    ]

    return {
        "alerts": {
            "total": total_alerts,
            "open": open_alerts,
            "critical": critical_alerts,
            "new_24h": new_alerts_24h,
        },
        "logs": {
            "total_24h": total_logs_24h,
            "errors_24h": error_logs_24h,
        },
        "alert_trend": alert_trend,
        "severity_breakdown": severity_breakdown,
        "log_volume": log_volume,
        "top_categories": top_categories,
        "recent_activity": recent_activity,
    }


@router.get("/audit-trail", summary="Get system audit trail")
async def audit_trail(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 100,
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    audits = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "user": a.user_email,
            "action": a.action,
            "resource_type": a.resource_type,
            "ip_address": a.ip_address,
            "status_code": a.status_code,
            "time": str(a.created_at),
        }
        for a in audits
    ]
