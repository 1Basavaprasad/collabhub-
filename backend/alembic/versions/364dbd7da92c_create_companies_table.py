"""create companies table

Revision ID: 364dbd7da92c
Revises: 4a87a58ccbbe
Create Date: 2026-08-21 21:05:12.360043

"""

from typing import Sequence, Union

from alembic import op
# pyrefly: ignore [missing-import]
import sqlalchemy as sa
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "364dbd7da92c"
down_revision: Union[str, Sequence[str], None] = "4a87a58ccbbe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Create companies table
    op.create_table(
        "companies",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Remove legacy Workspace tables
    op.drop_index(
        op.f("ix_workspaces_slug"),
        table_name="workspaces",
    )

    op.drop_table("workspace_members")
    op.drop_table("workspaces")

    # Remove legacy Workspace enum
    op.execute("DROP TYPE IF EXISTS workspace_role")


def downgrade() -> None:
    """Downgrade schema."""

    # Recreate legacy Workspace enum
    workspace_role = postgresql.ENUM(
        "OWNER",
        "ADMIN",
        "MEMBER",
        name="workspace_role",
    )
    workspace_role.create(op.get_bind(), checkfirst=True)

    # Recreate workspaces table
    op.create_table(
        "workspaces",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.VARCHAR(length=255), nullable=False),
        sa.Column("slug", sa.VARCHAR(length=100), nullable=False),
        sa.Column("description", sa.TEXT(), nullable=True),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_workspaces_slug"),
        "workspaces",
        ["slug"],
        unique=True,
    )

    # Recreate workspace_members table
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("workspace_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "role",
            workspace_role,
            nullable=False,
        ),
        sa.Column(
            "joined_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "user_id",
            name="uq_workspace_members_workspace_user",
        ),
    )

    # Remove companies table
    op.drop_table("companies")