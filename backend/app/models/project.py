import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.project_activity import ProjectActivity
    from app.models.project_member import ProjectMember
    from app.models.project_team import ProjectTeam
    from app.models.task import Task
    from app.models.user import User


class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.ACTIVE,
        index=True,
    )

    icon: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default="folder-kanban",
    )

    color: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default="indigo",
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    company: Mapped["Company"] = relationship(
        "Company",
        back_populates="projects",
    )

    creator: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[created_by],
    )

    teams: Mapped[list["ProjectTeam"]] = relationship(
        "ProjectTeam",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ProjectTeam.created_at)",
    )

    direct_members: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ProjectMember.created_at)",
    )

    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="asc(Task.position)",
    )

    activities: Mapped[list["ProjectActivity"]] = relationship(
        "ProjectActivity",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ProjectActivity.created_at)",
    )

    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_projects_company_name"),
        Index("ix_projects_company_status_created", "company_id", "status", "created_at"),
        Index("ix_projects_company_created", "company_id", "created_at", "id"),
    )
