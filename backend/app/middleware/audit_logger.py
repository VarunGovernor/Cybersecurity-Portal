from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.audit import AuditLog
from app.core.security import validate_access_token
import structlog
import time

logger = structlog.get_logger(__name__)

EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"}
EXCLUDED_PREFIXES = ("/static",)


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        if path in EXCLUDED_PATHS or any(path.startswith(p) for p in EXCLUDED_PREFIXES):
            return await call_next(request)

        start_time = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)

        # Extract user info from token if present
        user_id = None
        user_email = None
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                from jose import jwt
                from app.config import settings
                payload = jwt.decode(
                    token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
                )
                user_id = payload.get("sub")
                user_email = payload.get("email")
        except Exception:
            pass

        # Write audit log asynchronously
        try:
            async with AsyncSessionLocal() as session:
                audit = AuditLog(
                    user_id=user_id,
                    user_email=user_email,
                    action=f"{request.method} {path}",
                    resource_type=_extract_resource_type(path),
                    ip_address=_get_client_ip(request),
                    user_agent=request.headers.get("user-agent", "")[:512],
                    request_method=request.method,
                    request_path=path,
                    status_code=str(response.status_code),
                    details={"duration_ms": duration_ms},
                )
                session.add(audit)
                await session.commit()
        except Exception as e:
            logger.error("audit_log_write_failed", error=str(e))

        return response


def _extract_resource_type(path: str) -> str:
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 2:
        return parts[1]
    return parts[0] if parts else "unknown"


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
