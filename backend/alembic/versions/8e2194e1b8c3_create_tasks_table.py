"""create_tasks_table

Revision ID: 8e2194e1b8c3
Revises: 3d8194e1b8c2
Create Date: 2026-08-27 21:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8e2194e1b8c3'
down_revision: Union[str, Sequence[str], None] = '3d8194e1b8c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create task_status enum, task_priority enum, tasks table, and indexes."""
    # 1. Ensure task_status enum exists
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'task_status'
            ) THEN
                CREATE TYPE task_status AS ENUM (
                    'TODO',
                    'IN_PROGRESS',
                    'REVIEW',
                    'DONE'
                );
            END IF;
        END
        $$;
        """
    )

    # 2. Ensure task_priority enum exists
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'task_priority'
            ) THEN
                CREATE TYPE task_priority AS ENUM (
                    'LOW',
                    'MEDIUM',
                    'HIGH',
                    'URGENT'
                );
            END IF;
        END
        $$;
        """
    )

    # 3. Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', postgresql.ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', name='task_status', create_type=False), nullable=False, server_default='TODO'),
        sa.Column('priority', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='task_priority', create_type=False), nullable=False, server_default='MEDIUM'),
        sa.Column('assignee_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 4. Create indexes
    op.create_index('ix_tasks_project_id', 'tasks', ['project_id'], unique=False)
    op.create_index('ix_tasks_company_id', 'tasks', ['company_id'], unique=False)
    op.create_index('ix_tasks_status', 'tasks', ['status'], unique=False)
    op.create_index('ix_tasks_priority', 'tasks', ['priority'], unique=False)
    op.create_index('ix_tasks_assignee_id', 'tasks', ['assignee_id'], unique=False)
    op.create_index('ix_tasks_created_by', 'tasks', ['created_by'], unique=False)
    op.create_index('ix_tasks_project_status_pos', 'tasks', ['project_id', 'status', 'position'], unique=False)
    op.create_index('ix_tasks_project_created', 'tasks', ['project_id', 'created_at'], unique=False)


def downgrade() -> None:
    """Drop tasks table, indexes, and enums."""
    op.drop_index('ix_tasks_project_created', table_name='tasks')
    op.drop_index('ix_tasks_project_status_pos', table_name='tasks')
    op.drop_index('ix_tasks_created_by', table_name='tasks')
    op.drop_index('ix_tasks_assignee_id', table_name='tasks')
    op.drop_index('ix_tasks_priority', table_name='tasks')
    op.drop_index('ix_tasks_status', table_name='tasks')
    op.drop_index('ix_tasks_company_id', table_name='tasks')
    op.drop_index('ix_tasks_project_id', table_name='tasks')
    op.drop_table('tasks')

    op.execute("DROP TYPE IF EXISTS task_priority CASCADE;")
    op.execute("DROP TYPE IF EXISTS task_status CASCADE;")
