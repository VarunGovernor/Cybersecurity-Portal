from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.schemas.auth import UserCreate, UserUpdate, UserResponse, PasswordChange
from app.services.auth_service import AuthService
from app.core.dependencies import get_current_user, get_current_admin
from app.core.security import verify_password, get_password_hash
from app.models.user import User, UserRole
from sqlalchemy import update as sa_update

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=List[UserResponse], summary="List all users (Admin only)")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED,
             summary="Create a new user (Admin only)")
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    service = AuthService(db)
    try:
        user = await service.create_user(body)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID (Admin only)")
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    service = AuthService(db)
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse, summary="Update user (Admin only)")
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    service = AuthService(db)
    user = await service.update_user(user_id, body)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Delete user (Admin only)")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    service = AuthService(db)
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)


@router.post("/me/change-password", summary="Change own password")
async def change_password(
    body: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await db.execute(
        sa_update(User)
        .where(User.id == current_user.id)
        .values(hashed_password=get_password_hash(body.new_password))
    )
    return {"message": "Password updated successfully"}
