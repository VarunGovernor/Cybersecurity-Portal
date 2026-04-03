from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
import structlog

from app.database import get_db
from app.schemas.alert import (
    AlertCreate, AlertUpdate, AlertResponse, AlertListResponse, AlertStats
)
from app.models.alert import AlertSeverity, AlertStatus, AlertCategory
from app.services.alert_service import AlertService
from app.core.dependencies import get_current_user, get_analyst_or_admin
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alerts"])
logger = structlog.get_logger(__name__)


@router.get("", response_model=AlertListResponse, summary="List all alerts with filtering")
async def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    severity: Optional[AlertSeverity] = None,
    status: Optional[AlertStatus] = None,
    category: Optional[AlertCategory] = None,
    search: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AlertService(db)
    result = await service.list_alerts(
        page=page, page_size=page_size,
        severity=severity, status=status,
        category=category, search=search,
    )
    return AlertListResponse(**result)


@router.get("/stats", response_model=AlertStats, summary="Get alert statistics")
async def alert_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AlertService(db)
    return await service.get_stats()


@router.get("/{alert_id}", response_model=AlertResponse, summary="Get alert by ID")
async def get_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AlertService(db)
    alert = await service.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse.model_validate(alert)


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED,
             summary="Create a new alert")
async def create_alert(
    body: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_analyst_or_admin),
):
    service = AlertService(db)
    alert = await service.create_alert(body)
    return AlertResponse.model_validate(alert)


@router.patch("/{alert_id}", response_model=AlertResponse, summary="Update alert status/assignment")
async def update_alert(
    alert_id: UUID,
    body: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_analyst_or_admin),
):
    service = AlertService(db)
    alert = await service.update_alert(alert_id, body, current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse.model_validate(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete alert (Admin only)")
async def delete_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.user import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    service = AlertService(db)
    alert = await service.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    logger.info("alert_deleted", alert_id=str(alert_id), by=str(current_user.id))
