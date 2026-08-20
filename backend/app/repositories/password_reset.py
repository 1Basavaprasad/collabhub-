from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken


def create_password_reset_token(
    db: Session,
    user_id,
    token_hash: str,
    expires_at: datetime,
) -> PasswordResetToken:
    reset_token = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)

    return reset_token


def get_valid_password_reset_token(
    db: Session,
    token_hash: str,
) -> PasswordResetToken | None:
    statement = select(PasswordResetToken).where(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > datetime.now(timezone.utc),
    )

    return db.execute(statement).scalar_one_or_none()


def mark_password_reset_token_used(
    db: Session,
    reset_token: PasswordResetToken,
) -> None:
    reset_token.used_at = datetime.now(timezone.utc)

    db.commit()