# CyberSec Portal — API Documentation

Base URL: `http://localhost:8000/api/v1`
Interactive Docs: `http://localhost:8000/docs`

---

## Authentication

All endpoints require `Authorization: Bearer <token>` except `/auth/login`.

### POST /auth/login
Authenticate and receive a JWT access token.

**Request:**
```json
{ "email": "admin@cybersec.local", "password": "Admin@123456" }
```
**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": "uuid", "email": "...", "role": "admin", ... }
}
```

### GET /auth/me
Returns current authenticated user profile.

### POST /auth/logout
Invalidates session (client-side token discard).

---

## Dashboard

### GET /dashboard/summary
Returns aggregated statistics for the main dashboard.

**Response fields:**
- `alerts.total / open / critical / new_24h`
- `logs.total_24h / errors_24h`
- `alert_trend[]` — 7-day daily alert count
- `severity_breakdown{}` — open alerts by severity
- `log_volume[]` — hourly log events (last 24h)
- `top_categories[]` — top threat categories (7d)
- `recent_activity[]` — latest audit events

### GET /dashboard/audit-trail?limit=100
Returns paginated system audit log.

---

## Alerts

### GET /alerts
List alerts with optional filtering.

| Query Param | Type   | Description                        |
|-------------|--------|------------------------------------|
| page        | int    | Page number (default: 1)           |
| page_size   | int    | Items per page (default: 25, max 100) |
| severity    | enum   | critical, high, medium, low, info  |
| status      | enum   | open, investigating, resolved, false_positive, suppressed |
| category    | enum   | intrusion, malware, data_exfiltration, brute_force, anomaly, policy_violation, fraud, reconnaissance |
| search      | string | Search in alert title              |

### GET /alerts/stats
Returns alert statistics (total, open, critical, by_category, etc.)

### GET /alerts/{id}
Get a single alert by UUID.

### POST /alerts
Create a new alert manually. Requires `analyst` or `admin` role.

**Request:**
```json
{
  "title": "Suspicious outbound connection",
  "severity": "high",
  "category": "malware",
  "source_ip": "10.0.5.12",
  "destination_ip": "185.220.101.45",
  "destination_port": 4444,
  "description": "Endpoint connecting to known C2 port"
}
```

### PATCH /alerts/{id}
Update alert status or assignment.

```json
{ "status": "investigating", "notes": "Assigned to SOC analyst" }
```

### DELETE /alerts/{id}
Delete an alert. Requires `admin` role.

---

## Log Ingestion

### GET /logs
Query ingested logs with filtering.

| Query Param | Type     | Description                        |
|-------------|----------|------------------------------------|
| page        | int      | Page number                        |
| page_size   | int      | Default 50, max 200                |
| level       | enum     | debug, info, warning, error, critical |
| source      | enum     | firewall, ids, siem, application, system, network, endpoint, api |
| source_ip   | string   | Filter by source IP                |
| event_type  | string   | Filter by event type               |
| start_time  | datetime | ISO 8601 start time                |
| end_time    | datetime | ISO 8601 end time                  |
| search      | string   | Search in message field            |

### GET /logs/stats
Returns log statistics for the last 24 hours:
- `total_24h`, `by_level{}`, `by_source{}`, `events_per_hour[]`, `top_source_ips[]`

### POST /logs/ingest
Ingest a single log entry. Automatically runs threat detection rules.

**Request:**
```json
{
  "level": "error",
  "source": "firewall",
  "source_ip": "192.168.1.45",
  "destination_ip": "10.0.0.1",
  "destination_port": 22,
  "protocol": "tcp",
  "message": "Connection refused - authentication failure",
  "event_type": "authentication_failure",
  "action": "blocked"
}
```

**Response:**
```json
{
  "log_id": "uuid",
  "alerts_triggered": 1,
  "alert_ids": ["uuid"]
}
```

### POST /logs/ingest/batch
Ingest up to 1000 log entries in a single request.

```json
{
  "logs": [
    { "level": "info", "source": "system", "message": "..." },
    ...
  ]
}
```

---

## User Management (Admin only)

### GET /users
List all users. Requires `admin` role.

### POST /users
Create a new user.

```json
{
  "email": "analyst@company.com",
  "full_name": "Jane Smith",
  "password": "SecurePass123!",
  "role": "analyst"
}
```

### GET /users/{id}
Get a user by UUID.

### PATCH /users/{id}
Update user fields (role, is_active, full_name).

### DELETE /users/{id}
Delete a user. Cannot delete your own account.

### POST /users/me/change-password
Change your own password.

```json
{
  "current_password": "OldPass123",
  "new_password": "NewSecurePass456!"
}
```

---

## Threat Detection Rules

The following rules are built into the engine and run on every ingested log:

| Rule ID | Name                       | Severity | Category          | Trigger                                     |
|---------|----------------------------|----------|-------------------|---------------------------------------------|
| R001    | SSH Brute Force            | High     | Brute Force       | auth_failure + port 22 + tcp                |
| R002    | Port Scan Detected         | Medium   | Reconnaissance    | port_scan event + action=blocked            |
| R003    | SQL Injection Attempt      | Critical | Intrusion         | SQL pattern in message from app/api         |
| R004    | Anomalous Data Exfiltration| High     | Data Exfiltration | bytes_sent > 100MB                          |
| R005    | Potential C2 Communication | Critical | Malware           | dst_port in [4444, 5555, 6666, 8888, 31337] |
| R006    | Privilege Escalation       | Critical | Intrusion         | event_type in [sudo_failure, setuid_exec]   |
| R007    | After-Hours Login          | Medium   | Policy Violation  | auth_success between 00:00–06:00 UTC        |
| R008    | Firewall Bypass Attempt    | High     | Policy Violation  | source=firewall + event=rule_bypass_attempt |
| R009    | Directory Traversal        | High     | Intrusion         | ../  or %2e%2e in message                   |
| R010    | Ransomware Indicator       | Critical | Malware           | event_type in [mass_encryption, shadow_copy_deleted] |

---

## Roles & Permissions

| Permission         | Admin | Analyst | Viewer |
|--------------------|-------|---------|--------|
| View dashboard     | ✓     | ✓       | ✓      |
| View alerts        | ✓     | ✓       | ✓      |
| Create/update alerts| ✓    | ✓       | ✗      |
| Delete alerts      | ✓     | ✗       | ✗      |
| Ingest logs        | ✓     | ✓       | ✗      |
| View logs          | ✓     | ✓       | ✓      |
| Manage users       | ✓     | ✗       | ✗      |
| View audit trail   | ✓     | ✓       | ✓      |

---

## Error Responses

All errors follow the format:
```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning                        |
|--------|--------------------------------|
| 400    | Bad request / validation error |
| 401    | Missing or invalid JWT         |
| 403    | Insufficient role permissions  |
| 404    | Resource not found             |
| 409    | Conflict (e.g. duplicate email)|
| 422    | Unprocessable entity           |
| 429    | Rate limit exceeded            |
| 500    | Internal server error          |
