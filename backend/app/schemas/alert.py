from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from uuid import UUID
from datetime import datetime
from app.models.alert import AlertSeverity, AlertStatus, AlertCategory


class AlertCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=512)
    description: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.MEDIUM
    category: AlertCategory = AlertCategory.ANOMALY
    source_ip: Optional[str] = Field(None, max_length=45)
    destination_ip: Optional[str] = Field(None, max_length=45)
    source_port: Optional[int] = Field(None, ge=0, le=65535)
    destination_port: Optional[int] = Field(None, ge=0, le=65535)
    rule_id: Optional[str] = None
    rule_name: Optional[str] = None
    raw_event: Optional[Dict[str, Any]] = None


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    severity: Optional[AlertSeverity] = None
    assigned_to: Optional[UUID] = None
    notes: Optional[str] = None


class AlertResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    severity: AlertSeverity
    status: AlertStatus
    category: AlertCategory
    source_ip: Optional[str]
    destination_ip: Optional[str]
    source_port: Optional[int]
    destination_port: Optional[int]
    rule_id: Optional[str]
    rule_name: Optional[str]
    raw_event: Optional[Dict[str, Any]]
    assigned_to: Optional[UUID]
    resolved_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int
    pages: int


class AlertStats(BaseModel):
    total: int
    open: int
    critical: int
    high: int
    medium: int
    low: int
    resolved_today: int
    by_category: Dict[str, int]
