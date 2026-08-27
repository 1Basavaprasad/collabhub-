import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.team_chat_mention import TeamChatMention
    from app.models.team_chat_reaction import TeamChatReaction
    from app.models.user import User


class TeamChatMessage(Base):
    __tablename__ = "team_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    reply_to_message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("team_chat_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    is_pinned: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    pinned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    pinned_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

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

    # Relationships
    team: Mapped["Team"] = relationship(
        "Team",
    )

    sender: Mapped["User"] = relationship(
        "User",
        foreign_keys=[sender_id],
    )

    pinned_by: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[pinned_by_id],
    )

    reply_to_message: Mapped["TeamChatMessage | None"] = relationship(
        "TeamChatMessage",
        remote_side=[id],
        foreign_keys=[reply_to_message_id],
    )

    reactions: Mapped[list["TeamChatReaction"]] = relationship(
        "TeamChatReaction",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    mentions: Mapped[list["TeamChatMention"]] = relationship(
        "TeamChatMention",
        back_populates="message",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_team_chat_messages_team_created", "team_id", "created_at"),
    )

