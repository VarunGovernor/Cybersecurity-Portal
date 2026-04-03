# CyberSec Portal

> Production-grade Cybersecurity Analysis Platform for internal security teams.

Built with **FastAPI** + **PostgreSQL** + **Redis** on the backend, and **Next.js 14** (App Router) + **Tailwind CSS** + **Recharts** on the frontend.

---

## Screenshots

```
┌─────────────────────────────────────────────────────────┐
│  CyberSec  │  Security Dashboard                        │
│  Portal    │─────────────────────────────────────────── │
│            │  Open Alerts  Critical  New 24h  Logs 24h  │
│ Dashboard  │     142          8        23      84,291   │
│ Alerts     │                                             │
│ Log Explor │  Alert Trend (7d)     │  Open by Severity  │
│ Activity   │  [Area Chart]         │  [Pie Chart]       │
│            │                       │                     │
│ Users      │  Threat Categories    │  Recent Activity   │
│            │  [Horiz Bar Chart]    │  [Event Feed]      │
│ admin      │                                             │
│ Log Out    │                                             │
└─────────────────────────────────────────────────────────┘
```

---

## Features

### Backend
- **JWT Authentication** — Access + refresh tokens, bcrypt passwords
- **RBAC** — Admin, Analyst, Viewer roles with route-level enforcement
- **Log Ingestion** — Single and batch JSON log ingestion (up to 1000/request)
- **Threat Detection Engine** — 10 built-in rule-based detection rules (SSH brute force, SQLi, C2 traffic, ransomware indicators, etc.)
- **Alert Lifecycle** — Full status tracking (open → investigating → resolved)
- **Audit Trail** — Every API action logged to `audit_logs` table
- **Rate Limiting** — Per-IP via SlowAPI (configurable)
- **Security Headers** — X-Frame-Options, CSP, HSTS, nosniff
- **Async PostgreSQL** — SQLAlchemy 2.0 async with connection pooling
- **Structured Logging** — JSON logs via structlog

### Frontend
- **Dashboard** — Real-time stats, trend charts, activity feed
- **Alert Management** — Full table with filters, search, detail panel, status updates
- **Log Explorer** — Paginated log viewer with inline expansion, volume chart
- **User Management** — Admin-only user CRUD with role assignment
- **Activity Feed** — Full audit trail viewer
- **Log Ingestion** — JSON/JSONL file upload UI with preview
- **Dark Mode** — Full light/dark theme toggle
- **Responsive Layout** — Fixed sidebar + scrollable content

---

## Project Structure

```
cybersec-portal/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, middleware, lifespan
│   │   ├── config.py             # Pydantic settings from .env
│   │   ├── database.py           # Async SQLAlchemy engine + session
│   │   ├── models/
│   │   │   ├── user.py           # User model + UserRole enum
│   │   │   ├── alert.py          # Alert model + severity/status enums
│   │   │   ├── log.py            # LogEntry model
│   │   │   └── audit.py          # AuditLog model
│   │   ├── schemas/
│   │   │   ├── auth.py           # Login, token, user schemas
│   │   │   ├── alert.py          # Alert CRUD schemas
│   │   │   └── log.py            # Log ingestion schemas
│   │   ├── routes/
│   │   │   ├── auth.py           # /auth/login, /auth/me, /auth/logout
│   │   │   ├── alerts.py         # Full alert CRUD
│   │   │   ├── logs.py           # Log ingestion + query
│   │   │   ├── users.py          # User management (admin)
│   │   │   └── dashboard.py      # Aggregated stats + audit trail
│   │   ├── services/
│   │   │   ├── auth_service.py   # Auth logic, user CRUD, JWT
│   │   │   ├── alert_service.py  # Alert lifecycle management
│   │   │   ├── log_service.py    # Log ingestion + stats
│   │   │   └── threat_engine.py  # Rule-based detection engine (10 rules)
│   │   ├── middleware/
│   │   │   ├── audit_logger.py   # Per-request audit logging middleware
│   │   │   └── rate_limiter.py   # SlowAPI rate limiter + handler
│   │   └── core/
│   │       ├── security.py       # JWT encode/decode, bcrypt
│   │       └── dependencies.py   # FastAPI auth dependencies (RBAC)
│   ├── alembic/                  # Database migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with ThemeProvider
│   │   ├── globals.css           # CSS variables, Tailwind base
│   │   ├── page.tsx              # Redirect → /dashboard
│   │   ├── login/page.tsx        # JWT login page
│   │   └── (app)/                # Protected route group
│   │       ├── layout.tsx        # App shell (sidebar + auth guard)
│   │       ├── dashboard/page.tsx
│   │       ├── alerts/page.tsx
│   │       ├── logs/page.tsx
│   │       ├── users/page.tsx
│   │       └── activity/page.tsx
│   ├── components/
│   │   ├── sidebar.tsx           # Fixed sidebar with nav + user info
│   │   ├── navbar.tsx            # Top bar with title, clock, theme toggle
│   │   ├── stat-card.tsx         # KPI stat card
│   │   ├── chart-card.tsx        # Chart wrapper with loading state
│   │   ├── badges.tsx            # Severity, status, risk badges
│   │   ├── upload-panel.tsx      # Log file ingestion UI
│   │   └── theme-provider.tsx    # next-themes wrapper
│   ├── lib/
│   │   ├── api.ts                # Axios client + all API calls
│   │   ├── utils.ts              # Formatters, badge classes, cn()
│   │   └── store.ts              # Zustand auth store
│   ├── types/index.ts            # All TypeScript types
│   ├── tailwind.config.ts
│   ├── next.config.mjs
│   └── Dockerfile
│
├── docs/
│   └── API.md                    # Full API reference
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Option A — Docker Compose (Recommended)

**Prerequisites:** Docker 24+, Docker Compose v2

```bash
# 1. Clone the repository
git clone https://github.com/your-org/cybersec-portal.git
cd cybersec-portal

# 2. Start all services
docker compose up --build

# 3. Access the portal
open http://localhost:3000

# Default credentials:
#   Email:    admin@cybersec.local
#   Password: Admin@123456
```

Services started:
| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| Backend API| http://localhost:8000        |
| API Docs   | http://localhost:8000/docs   |
| PostgreSQL | localhost:5432               |
| Redis      | localhost:6379               |

---

### Option B — Local Development

#### Backend

**Prerequisites:** Python 3.11+, PostgreSQL 15+, Redis 7+

```bash
cd backend

# 1. Create virtualenv
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your DB credentials

# 4. Start PostgreSQL and Redis (example with Homebrew)
brew services start postgresql@16
brew services start redis

# 5. Create the database
createdb cybersec_db

# 6. Run database migrations (auto-runs on startup via init_db())
# OR use Alembic for production:
# alembic revision --autogenerate -m "initial"
# alembic upgrade head

# 7. Start the backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Admin user is seeded automatically on first startup
```

#### Frontend

**Prerequisites:** Node.js 20+

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# 3. Start dev server
npm run dev

# Access: http://localhost:3000
```

---

## Configuration

### Backend Environment Variables

| Variable                    | Default                    | Description                    |
|-----------------------------|----------------------------|--------------------------------|
| `APP_ENV`                   | `development`              | Environment name               |
| `DEBUG`                     | `true`                     | Enable debug mode              |
| `SECRET_KEY`                | —                          | App secret (min 32 chars) ⚠️   |
| `DATABASE_URL`              | —                          | Async PostgreSQL URL           |
| `REDIS_URL`                 | `redis://localhost:6379/0` | Redis connection URL           |
| `JWT_SECRET_KEY`            | —                          | JWT signing secret ⚠️          |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                     | JWT access token TTL           |
| `ALLOWED_ORIGINS`           | `http://localhost:3000`    | CORS allowed origins (CSV)     |
| `RATE_LIMIT_PER_MINUTE`     | `60`                       | API rate limit per IP          |
| `ADMIN_EMAIL`               | `admin@cybersec.local`     | Seed admin email               |
| `ADMIN_PASSWORD`            | `Admin@123456`             | Seed admin password ⚠️         |

> ⚠️ Always change these in production.

---

## API Quick Reference

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cybersec.local","password":"Admin@123456"}'

# Get dashboard summary (with token)
TOKEN="eyJ..."
curl http://localhost:8000/api/v1/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"

# Ingest a log (triggers threat detection)
curl -X POST http://localhost:8000/api/v1/logs/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "source": "firewall",
    "source_ip": "192.168.1.100",
    "destination_port": 4444,
    "message": "Outbound connection to suspicious port",
    "event_type": "c2_traffic"
  }'

# List open critical alerts
curl "http://localhost:8000/api/v1/alerts?status=open&severity=critical" \
  -H "Authorization: Bearer $TOKEN"
```

Full API documentation: [docs/API.md](docs/API.md) or `http://localhost:8000/docs`

---

## Security Notes

- All passwords hashed with **bcrypt** (12 rounds)
- JWTs signed with **HS256** — use RS256 in production for multi-service
- **Rate limiting** on all endpoints (configurable, stricter on `/auth/login`)
- **Security headers** on all responses (HSTS, X-Frame-Options, nosniff, XSS protection)
- **Input validation** on all endpoints via Pydantic v2
- **SQL injection** impossible — all queries use SQLAlchemy ORM parameterization
- **Audit trail** — every authenticated request is logged with user, IP, method, path, status

---

## Production Checklist

- [ ] Change `SECRET_KEY`, `JWT_SECRET_KEY`, `ADMIN_PASSWORD` in `.env`
- [ ] Use `DEBUG=false` and `APP_ENV=production`
- [ ] Place backend behind nginx/Caddy with TLS termination
- [ ] Use `HTTPS` — HSTS header is enabled in non-debug mode
- [ ] Configure proper `ALLOWED_ORIGINS` for your domain
- [ ] Use a managed PostgreSQL instance (RDS, Supabase, etc.)
- [ ] Set up log rotation / centralized logging (e.g. Loki)
- [ ] Enable PostgreSQL connection pooling (PgBouncer)
- [ ] Set up Redis persistence and AUTH password
- [ ] Add monitoring/alerting (Prometheus + Grafana)

---

## Tech Stack

| Layer       | Technology                   | Version  |
|-------------|------------------------------|----------|
| Backend     | FastAPI                      | 0.111    |
| ORM         | SQLAlchemy (async)           | 2.0      |
| Database    | PostgreSQL                   | 16       |
| Cache       | Redis                        | 7        |
| Migrations  | Alembic                      | 1.13     |
| Auth        | python-jose + passlib/bcrypt | —        |
| Validation  | Pydantic v2                  | 2.7      |
| Rate Limit  | SlowAPI                      | 0.1.9    |
| Logging     | structlog                    | 24.1     |
| Frontend    | Next.js (App Router)         | 14.2     |
| Styling     | Tailwind CSS                 | 3.4      |
| Charts      | Recharts                     | 2.12     |
| State       | Zustand                      | 4.5      |
| HTTP Client | Axios                        | 1.6      |
| Fonts       | Roboto (Google Fonts)        | —        |
| Container   | Docker + Compose             | 24+      |

---

## License

Internal use only. Not for public distribution.

All rights and copyrights are reserved to Varun Governor.
