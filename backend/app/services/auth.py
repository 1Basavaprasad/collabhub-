from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user import (
    create_user,
    get_user_by_email,
    get_user_by_username,
)
from app.schemas.auth import RegisterRequest


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