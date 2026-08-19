# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth import login_user, register_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_user(db, data)

        return {
            "message": "User registered successfully",
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        user = login_user(db, data)

        return {
            "message": "Login successful",
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )