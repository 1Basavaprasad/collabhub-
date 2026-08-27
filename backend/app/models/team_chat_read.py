import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.team_chat_message import TeamChatMessage
    from app.models.user import User


class TeamChatRead(Base):
    __tablename__ = "team_chat_reads"

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

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    last_read_message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("team_chat_messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    last_read_at: Mapped[datetime] = mapped_column(
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

    user: Mapped["User"] = relationship(
        "User",
    )

    last_read_message: Mapped["TeamChatMessage | None"] = relationship(
        "TeamChatMessage",
        foreign_keys=[last_read_message_id],
    )

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_chat_read_team_user"),
        Index("ix_team_chat_reads_team_user", "team_id", "user_id"),
    )
