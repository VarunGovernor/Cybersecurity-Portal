"""
Rule-based threat detection engine.
Evaluates log entries against defined detection rules and generates alerts.
"""
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Dict, Any
from datetime import datetime
import re
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class DetectionRule:
    id: str
    name: str
    description: str
    severity: str  # critical, high, medium, low
    category: str
    condition: Callable[[Dict[str, Any]], bool]
    enabled: bool = True
    tags: List[str] = field(default_factory=list)


@dataclass
class RuleMatch:
    rule: DetectionRule
    log_data: Dict[str, Any]
    matched_at: datetime = field(default_factory=datetime.utcnow)


class ThreatRulesEngine:
    """
    Stateless, rule-based threat detection engine.
    Rules are evaluated against normalized log dictionaries.
    """

    def __init__(self):
        self._rules: List[DetectionRule] = []
        self._register_default_rules()

    def register_rule(self, rule: DetectionRule):
        self._rules.append(rule)
        logger.info("threat_rule_registered", rule_id=rule.id, rule_name=rule.name)

    def evaluate(self, log_data: Dict[str, Any]) -> List[RuleMatch]:
        """Evaluate a log entry against all enabled rules. Returns matched rules."""
        matches = []
        for rule in self._rules:
            if not rule.enabled:
                continue
            try:
                if rule.condition(log_data):
                    matches.append(RuleMatch(rule=rule, log_data=log_data))
                    logger.info(
                        "rule_matched",
                        rule_id=rule.id,
                        source_ip=log_data.get("source_ip"),
                    )
            except Exception as e:
                logger.error("rule_evaluation_error", rule_id=rule.id, error=str(e))
        return matches

    def _register_default_rules(self):
        """Register built-in detection rules."""

        # SSH Brute Force
        self.register_rule(DetectionRule(
            id="R001",
            name="SSH Brute Force Attempt",
            description="Multiple failed SSH authentication attempts from same source",
            severity="high",
            category="brute_force",
            condition=lambda log: (
                log.get("event_type") == "authentication_failure" and
                log.get("destination_port") == 22 and
                log.get("protocol", "").lower() == "tcp"
            ),
            tags=["ssh", "brute_force", "authentication"],
        ))

        # Port Scan Detection
        self.register_rule(DetectionRule(
            id="R002",
            name="Port Scan Detected",
            description="Sequential port scanning activity from source IP",
            severity="medium",
            category="reconnaissance",
            condition=lambda log: (
                log.get("event_type") in ("port_scan", "connection_refused") and
                log.get("action") == "blocked"
            ),
            tags=["reconnaissance", "scanning"],
        ))

        # SQL Injection Attempt
        self.register_rule(DetectionRule(
            id="R003",
            name="SQL Injection Attempt",
            description="SQL injection pattern detected in request payload",
            severity="critical",
            category="intrusion",
            condition=lambda log: (
                log.get("source") == "application" and
                log.get("message") is not None and
                bool(re.search(
                    r"(union\s+select|drop\s+table|insert\s+into|'\s*or\s*'1'='1|--\s*$|xp_cmdshell)",
                    str(log.get("message", "")).lower()
                ))
            ),
            tags=["sqli", "web", "injection"],
        ))

        # Large Data Transfer
        self.register_rule(DetectionRule(
            id="R004",
            name="Anomalous Data Exfiltration",
            description="Unusually large outbound data transfer detected",
            severity="high",
            category="data_exfiltration",
            condition=lambda log: (
                (log.get("bytes_sent") or 0) > 100_000_000  # 100MB threshold
            ),
            tags=["exfiltration", "data_loss"],
        ))

        # Malware C2 Traffic
        self.register_rule(DetectionRule(
            id="R005",
            name="Potential C2 Communication",
            description="Outbound traffic to known suspicious ports associated with C2",
            severity="critical",
            category="malware",
            condition=lambda log: (
                log.get("destination_port") in (4444, 5555, 6666, 8888, 31337, 1337) and
                log.get("action") != "blocked"
            ),
            tags=["c2", "malware", "backdoor"],
        ))

        # Privilege Escalation
        self.register_rule(DetectionRule(
            id="R006",
            name="Privilege Escalation Attempt",
            description="Potential privilege escalation activity detected",
            severity="critical",
            category="intrusion",
            condition=lambda log: (
                log.get("event_type") in ("sudo_failure", "privilege_escalation", "setuid_execution")
            ),
            tags=["privilege_escalation", "linux"],
        ))

        # After-Hours Login
        self.register_rule(DetectionRule(
            id="R007",
            name="After-Hours Login",
            description="Successful authentication outside business hours (midnight–6am UTC)",
            severity="medium",
            category="policy_violation",
            condition=lambda log: (
                log.get("event_type") == "authentication_success" and
                log.get("timestamp") is not None and
                _is_after_hours(log.get("timestamp"))
            ),
            tags=["after_hours", "anomaly"],
        ))

        # Firewall Rule Bypass
        self.register_rule(DetectionRule(
            id="R008",
            name="Firewall Rule Bypass Attempt",
            description="Traffic attempting to circumvent firewall rules",
            severity="high",
            category="policy_violation",
            condition=lambda log: (
                log.get("source") == "firewall" and
                log.get("event_type") == "rule_bypass_attempt"
            ),
            tags=["firewall", "bypass"],
        ))

        # Directory Traversal
        self.register_rule(DetectionRule(
            id="R009",
            name="Directory Traversal Attempt",
            description="Path traversal pattern detected in web request",
            severity="high",
            category="intrusion",
            condition=lambda log: (
                log.get("source") in ("application", "api") and
                bool(re.search(r"\.\./|\.\.\\|%2e%2e", str(log.get("message", "")).lower()))
            ),
            tags=["traversal", "web", "lfi"],
        ))

        # Ransomware Indicator
        self.register_rule(DetectionRule(
            id="R010",
            name="Ransomware Indicator",
            description="Mass file encryption pattern detected on endpoint",
            severity="critical",
            category="malware",
            condition=lambda log: (
                log.get("event_type") in ("mass_file_rename", "mass_encryption", "shadow_copy_deleted")
            ),
            tags=["ransomware", "endpoint"],
        ))


def _is_after_hours(timestamp) -> bool:
    try:
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        return 0 <= timestamp.hour < 6
    except Exception:
        return False


# Singleton instance
threat_engine = ThreatRulesEngine()
