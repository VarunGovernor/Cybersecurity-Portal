from sqlalchemy import Column, String, Text, DateTime, Enum as SAEnum, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class AlertSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"
    SUPPRESSED = "suppressed"


class AlertCategory(str, enum.Enum):
    INTRUSION = "intrusion"
    MALWARE = "malware"
    DATA_EXFILTRATION = "data_exfiltration"
    BRUTE_FORCE = "brute_force"
    ANOMALY = "anomaly"
    POLICY_VIOLATION = "policy_violation"
    FRAUD = "fraud"
    RECONNAISSANCE = "reconnaissance"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(SAEnum(AlertSeverity), nullable=False, default=AlertSeverity.MEDIUM)
    status = Column(SAEnum(AlertStatus), nullable=False, default=AlertStatus.OPEN)
    category = Column(SAEnum(AlertCategory), nullable=False, default=AlertCategory.ANOMALY)
    source_ip = Column(String(45), nullable=True)
    destination_ip = Column(String(45), nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    rule_id = Column(String(128), nullable=True, index=True)
    rule_name = Column(String(256), nullable=True)
    raw_event = Column(JSON, nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Alert {self.title} [{self.severity}/{self.status}]>"
