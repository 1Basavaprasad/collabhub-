"""add_task_completion_fields

Revision ID: 8f4c2191b2c4
Revises: 8e2194e1b8c3
Create Date: 2026-08-27 22:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8f4c2191b2c4"
down_revision: Union[str, None] = "8e2194e1b8c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("completed_by_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "tasks",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_tasks_completed_by_id_users",
        "tasks",
        "users",
        ["completed_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_tasks_completed_by_id",
        "tasks",
        ["completed_by_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_tasks_completed_by_id", table_name="tasks")
    op.drop_constraint("fk_tasks_completed_by_id_users", "tasks", type_="foreignkey")
    op.drop_column("tasks", "completed_at")
    op.drop_column("tasks", "completed_by_id")
