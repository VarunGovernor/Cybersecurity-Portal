from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.schemas.log import LogIngest, LogBatchIngest, LogResponse, LogListResponse, LogStats
from app.models.log import LogLevel, LogSource
from app.services.log_service import LogService
from app.services.alert_service import AlertService
from app.core.dependencies import get_current_user, get_analyst_or_admin
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["Log Ingestion"])


@router.get("", response_model=LogListResponse, summary="Query ingested logs")
async def list_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    level: Optional[LogLevel] = None,
    source: Optional[LogSource] = None,
    source_ip: Optional[str] = Query(None, max_length=45),
    event_type: Optional[str] = Query(None, max_length=128),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    search: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LogService(db)
    result = await service.list_logs(
        page=page, page_size=page_size,
        level=level, source=source,
        source_ip=source_ip, event_type=event_type,
        start_time=start_time, end_time=end_time,
        search=search,
    )
    return LogListResponse(**result)


@router.get("/stats", response_model=LogStats, summary="Get log statistics for last 24 hours")
async def log_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LogService(db)
    return await service.get_stats()


@router.post("/ingest", summary="Ingest a single log entry")
async def ingest_log(
    body: LogIngest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_analyst_or_admin),
):
    log_service = LogService(db)
    alert_service = AlertService(db)

    entry, matches = await log_service.ingest_log(body)

    # Create alerts for any rule matches
    created_alerts = []
    for match in matches:
        alert = await alert_service.create_from_rule_match(match, body.model_dump())
        created_alerts.append(str(alert.id))

    return {
        "log_id": str(entry.id),
        "alerts_triggered": len(created_alerts),
        "alert_ids": created_alerts,
    }


@router.post("/ingest/batch", summary="Ingest a batch of log entries (max 1000)")
async def ingest_batch(
    body: LogBatchIngest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_analyst_or_admin),
):
    log_service = LogService(db)
    result = await log_service.ingest_batch(body.logs)
    return result
