import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.team_chat_message import TeamChatMessage
    from app.models.user import User


class TeamChatReaction(Base):
    __tablename__ = "team_chat_reactions"

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

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    emoji: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    message: Mapped["TeamChatMessage"] = relationship(
        "TeamChatMessage",
        back_populates="reactions",
    )

    user: Mapped["User"] = relationship(
        "User",
    )

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_team_chat_reaction_msg_user_emoji"),
        Index("ix_team_chat_reactions_msg_emoji", "message_id", "emoji"),
    )
