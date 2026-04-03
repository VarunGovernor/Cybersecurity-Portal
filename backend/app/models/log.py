from sqlalchemy import Column, String, Text, DateTime, Enum as SAEnum, Integer, BigInteger, JSON, Index
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class LogLevel(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogSource(str, enum.Enum):
    FIREWALL = "firewall"
    IDS = "ids"
    SIEM = "siem"
    APPLICATION = "application"
    SYSTEM = "system"
    NETWORK = "network"
    ENDPOINT = "endpoint"
    API = "api"


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    level = Column(SAEnum(LogLevel), nullable=False, default=LogLevel.INFO)
    source = Column(SAEnum(LogSource), nullable=False, default=LogSource.SYSTEM)
    source_ip = Column(String(45), nullable=True, index=True)
    destination_ip = Column(String(45), nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(16), nullable=True)
    message = Column(Text, nullable=False)
    event_type = Column(String(128), nullable=True, index=True)
    user_agent = Column(String(512), nullable=True)
    bytes_sent = Column(BigInteger, nullable=True)
    bytes_received = Column(BigInteger, nullable=True)
    action = Column(String(64), nullable=True)
    raw_log = Column(JSON, nullable=True)
    host = Column(String(255), nullable=True)
    service = Column(String(128), nullable=True)
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_log_entries_timestamp_level", "timestamp", "level"),
        Index("ix_log_entries_source_ip_timestamp", "source_ip", "timestamp"),
    )

    def __repr__(self):
        return f"<LogEntry {self.event_type} @ {self.timestamp}>"
