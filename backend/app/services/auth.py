# pyrefly: ignore [missing-import]
from app.repositories.user import get_user_by_id
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
)
from app.schemas.auth import LoginRequest, RegisterRequest


from datetime import datetime, timedelta, timezone

from app.core.security import (
    generate_password_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)

from app.repositories.password_reset import (
    create_password_reset_token,
    get_valid_password_reset_token,
    mark_password_reset_token_used,
)


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



def forgot_password(db: Session, email: str) -> str | None:
    user = get_user_by_email(db, email)

    if not user:
        return None

    raw_token = generate_password_reset_token()
    token_hash = hash_reset_token(raw_token)

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    create_password_reset_token(
        db=db,
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    return raw_token



def reset_password(
    db: Session,
    token: str,
    new_password: str,
) -> None:
    token_hash = hash_reset_token(token)

    reset_token = get_valid_password_reset_token(
        db,
        token_hash,
    )

    if not reset_token:
        raise ValueError("Invalid or expired password reset token")

    user = get_user_by_id(
        db,
        str(reset_token.user_id),
    )

    if not user:
        raise ValueError("User not found")

    user.password_hash = hash_password(new_password)

    mark_password_reset_token_used(
        db,
        reset_token,
    )

    db.refresh(user)