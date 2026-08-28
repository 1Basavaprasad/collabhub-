"""create_notifications_and_preferences_table

Revision ID: d1928374a81b
Revises: c72a819b4e33
Create Date: 2026-08-28 15:37:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd1928374a81b'
down_revision: Union[str, None] = 'c72a819b4e33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add DECLINED to invitation_status if not exists
    op.execute("ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'DECLINED'")

    # 2. Create notification_entity_type enum if not exists
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_entity_type') THEN
                CREATE TYPE notification_entity_type AS ENUM ('TASK', 'PROJECT', 'TEAM', 'MESSAGE', 'INVITATION', 'SYSTEM');
            END IF;
        END$$;
    """)

    # 3. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column(
            'entity_type',
            postgresql.ENUM('TASK', 'PROJECT', 'TEAM', 'MESSAGE', 'INVITATION', 'SYSTEM', name='notification_entity_type', create_type=False),
            nullable=False,
            server_default='SYSTEM',
        ),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('deep_link', sa.String(length=500), nullable=True),
        sa.Column('is_read', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_company_id', 'notifications', ['company_id'])
    op.create_index('ix_notifications_actor_id', 'notifications', ['actor_id'])
    op.create_index('ix_notifications_entity_type', 'notifications', ['entity_type'])
    op.create_index('ix_notifications_entity_id', 'notifications', ['entity_id'])
    op.create_index('ix_notifications_action', 'notifications', ['action'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])

    # Composite query optimization indexes
    op.create_index('ix_notifications_user_is_read', 'notifications', ['user_id', 'is_read'])
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', 'created_at'])
    op.create_index('ix_notifications_company_user_created', 'notifications', ['company_id', 'user_id', 'created_at'])

    # 4. Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('task_assignments_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('task_updates_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('mentions_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('team_activity_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('project_activity_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('invitations_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('chat_messages_in_app', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('task_assignments_email', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('task_updates_email', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('mentions_email', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('team_activity_email', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('project_activity_email', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('invitations_email', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('chat_messages_email', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'])


def downgrade() -> None:
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
    op.execute("DROP TYPE IF EXISTS notification_entity_type")
