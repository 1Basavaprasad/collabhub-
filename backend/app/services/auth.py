from datetime import datetime, timedelta, timezone

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.security import (
    generate_password_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.models.user import User
from app.repositories.password_reset import (
    create_password_reset_token,
    get_valid_password_reset_token,
    mark_password_reset_token_used,
)
from app.repositories.user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
)
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.email import send_password_reset_email
from app.core.config import settings


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

    # Generate a secure raw token
    raw_token = generate_password_reset_token()

    # Store only the hash in the database
    token_hash = hash_reset_token(raw_token)

    # Token expires after 15 minutes
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    # Save the hashed token
    create_password_reset_token(
        db=db,
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    # Create the reset link
    reset_link = (
    f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
)

    # DEBUG: confirm that we reached the email function
    print(
        "DEBUG 1: About to call send_password_reset_email",
        flush=True,
    )

    # Send reset email
    send_password_reset_email(
        email=user.email,
        reset_link=reset_link,
    )

    # DEBUG: confirm that the email function completed
    print(
        "DEBUG 2: Email function finished",
        flush=True,
    )

    # Keep returning the token for development/testing.
    # Later, remove this from the API response.
    return raw_token


def reset_password(
    db: Session,
    token: str,
    new_password: str,
) -> None:
    # Hash the token received from the user
    token_hash = hash_reset_token(token)

    # Find a valid, unused, non-expired token
    reset_token = get_valid_password_reset_token(
        db,
        token_hash,
    )

    if not reset_token:
        raise ValueError(
            "Invalid or expired password reset token"
        )

    # Find the user who requested the reset
    user = get_user_by_id(
        db,
        str(reset_token.user_id),
    )

    if not user:
        raise ValueError("User not found")

    # Hash and update the new password
    user.password_hash = hash_password(new_password)

    # Mark reset token as used
    mark_password_reset_token_used(
        db,
        reset_token,
    )

    db.commit()
    db.refresh(user)