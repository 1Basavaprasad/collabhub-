from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import (
    create_user,
    get_user_by_email,
    get_user_by_username,
)
from app.schemas.auth import LoginRequest, RegisterRequest


def register_user(db: Session, data: RegisterRequest) -> User:
    existing_email = get_user_by_email(db, data.email)

    if existing_email:
        raise ValueError("Email already registered")

    existing_username = get_user_by_username(db, data.username)

    if existing_username:
        raise ValueError("Username already taken")

    password_hash = hash_password(data.password)

    user = create_user(
        db=db,
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        password_hash=password_hash,
    )

    return user


def login_user(db: Session, data: LoginRequest) -> User:
    user = get_user_by_email(db, data.email)

    if not user:
        raise ValueError("Invalid email or password")

    if not verify_password(data.password, user.password_hash):
        raise ValueError("Invalid email or password")

    return user