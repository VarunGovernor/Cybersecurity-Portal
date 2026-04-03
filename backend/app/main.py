"""
CyberSec Portal — FastAPI Backend
Production-grade cybersecurity analysis platform.
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.middleware.audit_logger import AuditLogMiddleware
from app.middleware.rate_limiter import limiter, rate_limit_exceeded_handler
from app.routes import auth, alerts, logs, users, dashboard

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("startup_begin", env=settings.app_env)

    # Initialize database
    await init_db()

    # Seed admin user
    async with AsyncSessionLocal() as session:
        from app.services.auth_service import AuthService
        svc = AuthService(session)
        await svc.seed_admin()
        await session.commit()

    logger.info("startup_complete", app=settings.app_name)
    yield
    logger.info("shutdown", app=settings.app_name)


app = FastAPI(
    title="CyberSec Portal API",
    description="""
## CyberSec Analysis Portal

Production-grade REST API for internal security teams.

### Features
- **Log Ingestion**: Ingest JSON logs from any source
- **Threat Detection**: Rule-based threat detection engine (10 built-in rules)
- **Alert Management**: Full alert lifecycle management
- **User Management**: JWT-based auth with RBAC (Admin, Analyst, Viewer)
- **Audit Trail**: Complete audit logging of all actions

### Authentication
All endpoints (except `/api/v1/auth/login`) require a Bearer JWT token.
""",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host
if not settings.debug:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Audit logging
app.add_middleware(AuditLogMiddleware)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=str(request.url), error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if not settings.debug:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Routes
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(logs.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
        "env": settings.app_env,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "health": "/health",
    }
