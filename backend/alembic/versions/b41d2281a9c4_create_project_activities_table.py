"""create_project_activities_table

Revision ID: b41d2281a9c4
Revises: 9a3d1182c1b3
Create Date: 2026-08-27 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "b41d2281a9c4"
down_revision: Union[str, None] = "9a3d1182c1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "project_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("event_metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_project_activities_project_id",
        "project_activities",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        "ix_project_activities_company_id",
        "project_activities",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        "ix_project_activities_actor_user_id",
        "project_activities",
        ["actor_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_project_activities_task_id",
        "project_activities",
        ["task_id"],
        unique=False,
    )
    op.create_index(
        "ix_project_activities_action",
        "project_activities",
        ["action"],
        unique=False,
    )
    op.create_index(
        "ix_project_activities_project_created",
        "project_activities",
        ["project_id", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_project_activities_company_project",
        "project_activities",
        ["company_id", "project_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_project_activities_company_project", table_name="project_activities")
    op.drop_index("ix_project_activities_project_created", table_name="project_activities")
    op.drop_index("ix_project_activities_action", table_name="project_activities")
    op.drop_index("ix_project_activities_task_id", table_name="project_activities")
    op.drop_index("ix_project_activities_actor_user_id", table_name="project_activities")
    op.drop_index("ix_project_activities_company_id", table_name="project_activities")
    op.drop_index("ix_project_activities_project_id", table_name="project_activities")
    op.drop_table("project_activities")
