from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from uuid import UUID
from datetime import datetime
from app.models.log import LogLevel, LogSource


class LogIngest(BaseModel):
    timestamp: Optional[datetime] = None
    level: LogLevel = LogLevel.INFO
    source: LogSource = LogSource.SYSTEM
    source_ip: Optional[str] = Field(None, max_length=45)
    destination_ip: Optional[str] = Field(None, max_length=45)
    source_port: Optional[int] = Field(None, ge=0, le=65535)
    destination_port: Optional[int] = Field(None, ge=0, le=65535)
    protocol: Optional[str] = Field(None, max_length=16)
    message: str = Field(..., min_length=1)
    event_type: Optional[str] = Field(None, max_length=128)
    user_agent: Optional[str] = None
    bytes_sent: Optional[int] = None
    bytes_received: Optional[int] = None
    action: Optional[str] = Field(None, max_length=64)
    raw_log: Optional[Dict[str, Any]] = None
    host: Optional[str] = Field(None, max_length=255)
    service: Optional[str] = Field(None, max_length=128)


class LogBatchIngest(BaseModel):
    logs: List[LogIngest] = Field(..., max_length=1000)


class LogResponse(BaseModel):
    id: UUID
    timestamp: datetime
    level: LogLevel
    source: LogSource
    source_ip: Optional[str]
    destination_ip: Optional[str]
    protocol: Optional[str]
    message: str
    event_type: Optional[str]
    action: Optional[str]
    host: Optional[str]
    service: Optional[str]
    ingested_at: datetime

    model_config = {"from_attributes": True}


class LogListResponse(BaseModel):
    items: List[LogResponse]
    total: int
    page: int
    page_size: int
    pages: int


class LogStats(BaseModel):
    total_24h: int
    by_level: Dict[str, int]
    by_source: Dict[str, int]
    events_per_hour: List[Dict[str, Any]]
    top_source_ips: List[Dict[str, Any]]
