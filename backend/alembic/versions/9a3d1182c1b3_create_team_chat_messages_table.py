"""create_team_chat_messages_table

Revision ID: 9a3d1182c1b3
Revises: 8f4c2191b2c4
Create Date: 2026-08-27 22:07:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "9a3d1182c1b3"
down_revision: Union[str, None] = "8f4c2191b2c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "team_chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_team_chat_messages_team_id",
        "team_chat_messages",
        ["team_id"],
        unique=False,
    )
    op.create_index(
        "ix_team_chat_messages_sender_id",
        "team_chat_messages",
        ["sender_id"],
        unique=False,
    )
    op.create_index(
        "ix_team_chat_messages_team_created",
        "team_chat_messages",
        ["team_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_team_chat_messages_team_created", table_name="team_chat_messages")
    op.drop_index("ix_team_chat_messages_sender_id", table_name="team_chat_messages")
    op.drop_index("ix_team_chat_messages_team_id", table_name="team_chat_messages")
    op.drop_table("team_chat_messages")
