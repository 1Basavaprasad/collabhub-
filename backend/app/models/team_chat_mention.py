import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.team_chat_message import TeamChatMessage
    from app.models.user import User


class TeamChatMention(Base):
    __tablename__ = "team_chat_mentions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("team_chat_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mentioned_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    message: Mapped["TeamChatMessage"] = relationship(
        "TeamChatMessage",
        back_populates="mentions",
    )

    mentioned_user: Mapped["User"] = relationship(
        "User",
    )

    __table_args__ = (
        UniqueConstraint("message_id", "mentioned_user_id", name="uq_team_chat_mention_msg_user"),
        Index("ix_team_chat_mentions_user", "mentioned_user_id"),
    )
