import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # In-App Notification Toggles
    task_assignments_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    task_updates_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mentions_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    team_activity_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    project_activity_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invitations_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    chat_messages_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Email Notification Toggles
    task_assignments_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    task_updates_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mentions_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    team_activity_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    project_activity_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invitations_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    chat_messages_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
