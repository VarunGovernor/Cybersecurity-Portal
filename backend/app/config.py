from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "CyberSec Portal"
    app_env: str = "development"
    debug: bool = False
    secret_key: str = "change-me-in-production-32-chars-min"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cybersec_db"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/cybersec_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "change-me-jwt-secret-32-chars-min"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # Admin seed
    admin_email: str = "admin@cybersec.local"
    admin_password: str = "Admin@123456"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
