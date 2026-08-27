"""upgrade_team_chat_system

Revision ID: c72a819b4e33
Revises: b41d2281a9c4
Create Date: 2026-08-27 22:41:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c72a819b4e33'
down_revision: Union[str, None] = 'b41d2281a9c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns to team_chat_messages
    op.add_column('team_chat_messages', sa.Column('reply_to_message_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('team_chat_messages', sa.Column('is_pinned', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('team_chat_messages', sa.Column('pinned_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('team_chat_messages', sa.Column('pinned_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('team_chat_messages', sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('team_chat_messages', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key(
        'fk_team_chat_messages_reply_to_id',
        'team_chat_messages', 'team_chat_messages',
        ['reply_to_message_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_team_chat_messages_pinned_by_id',
        'team_chat_messages', 'users',
        ['pinned_by_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_team_chat_messages_reply_to', 'team_chat_messages', ['reply_to_message_id'])
    op.create_index('ix_team_chat_messages_is_pinned', 'team_chat_messages', ['is_pinned'])

    # 2. Create team_chat_reactions table
    op.create_table(
        'team_chat_reactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('team_chat_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('emoji', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('message_id', 'user_id', 'emoji', name='uq_team_chat_reaction_msg_user_emoji')
    )
    op.create_index('ix_team_chat_reactions_msg_emoji', 'team_chat_reactions', ['message_id', 'emoji'])
    op.create_index('ix_team_chat_reactions_user_id', 'team_chat_reactions', ['user_id'])

    # 3. Create team_chat_mentions table
    op.create_table(
        'team_chat_mentions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('team_chat_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mentioned_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('message_id', 'mentioned_user_id', name='uq_team_chat_mention_msg_user')
    )
    op.create_index('ix_team_chat_mentions_user', 'team_chat_mentions', ['mentioned_user_id'])

    # 4. Create team_chat_reads table
    op.create_table(
        'team_chat_reads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('last_read_message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('team_chat_messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('last_read_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.UniqueConstraint('team_id', 'user_id', name='uq_team_chat_read_team_user')
    )
    op.create_index('ix_team_chat_reads_team_user', 'team_chat_reads', ['team_id', 'user_id'])


def downgrade() -> None:
    op.drop_table('team_chat_reads')
    op.drop_table('team_chat_mentions')
    op.drop_table('team_chat_reactions')

    op.drop_index('ix_team_chat_messages_is_pinned', table_name='team_chat_messages')
    op.drop_index('ix_team_chat_messages_reply_to', table_name='team_chat_messages')
    op.drop_constraint('fk_team_chat_messages_pinned_by_id', 'team_chat_messages', type_='foreignkey')
    op.drop_constraint('fk_team_chat_messages_reply_to_id', 'team_chat_messages', type_='foreignkey')

    op.drop_column('team_chat_messages', 'deleted_at')
    op.drop_column('team_chat_messages', 'edited_at')
    op.drop_column('team_chat_messages', 'pinned_by_id')
    op.drop_column('team_chat_messages', 'pinned_at')
    op.drop_column('team_chat_messages', 'is_pinned')
    op.drop_column('team_chat_messages', 'reply_to_message_id')
