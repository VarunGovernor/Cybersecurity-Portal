from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
import structlog

from app.models.user import User, UserRole
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    validate_access_token
)
from app.schemas.auth import UserCreate, UserUpdate
from app.config import settings

logger = structlog.get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            logger.warning("auth_failed", email=email)
            return None

        if not user.is_active:
            logger.warning("auth_inactive_account", email=email)
            return None

        # Update last_login
        await self.db.execute(
            update(User)
            .where(User.id == user.id)
            .values(last_login=datetime.now(timezone.utc))
        )

        logger.info("auth_success", user_id=str(user.id), email=email)
        return user

    def generate_tokens(self, user: User) -> dict:
        token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": settings.access_token_expire_minutes * 60,
        }

    async def create_user(self, user_data: UserCreate) -> User:
        existing = await self.db.execute(
            select(User).where(User.email == user_data.email.lower())
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"User with email {user_data.email} already exists")

        user = User(
            email=user_data.email.lower(),
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role,
            is_active=True,
            is_verified=True,
        )
        self.db.add(user)
        await self.db.flush()
        logger.info("user_created", user_id=str(user.id), email=user.email)
        return user

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def update_user(self, user_id: UUID, data: UserUpdate) -> Optional[User]:
        update_dict = data.model_dump(exclude_none=True)
        if not update_dict:
            return await self.get_user_by_id(user_id)

        await self.db.execute(
            update(User).where(User.id == user_id).values(**update_dict)
        )
        return await self.get_user_by_id(user_id)

    async def seed_admin(self) -> User:
        result = await self.db.execute(
            select(User).where(User.email == settings.admin_email.lower())
        )
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                email=settings.admin_email.lower(),
                full_name="System Administrator",
                hashed_password=get_password_hash(settings.admin_password),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True,
            )
            self.db.add(admin)
            await self.db.flush()
            logger.info("admin_seeded", email=settings.admin_email)
        return admin
