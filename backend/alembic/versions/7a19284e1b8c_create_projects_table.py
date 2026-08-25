"""create_projects_table

Revision ID: 7a19284e1b8c
Revises: a814d3198e21
Create Date: 2026-08-25 21:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7a19284e1b8c'
down_revision: Union[str, Sequence[str], None] = 'a814d3198e21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create projects table, enum, indexes, and foreign keys."""
    # Ensure project_status enum exists
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'project_status'
            ) THEN
                CREATE TYPE project_status AS ENUM (
                    'ACTIVE',
                    'ARCHIVED'
                );
            END IF;
        END
        $$;
        """
    )

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', postgresql.ENUM('ACTIVE', 'ARCHIVED', name='project_status', create_type=False), nullable=False, server_default='ACTIVE'),
        sa.Column('icon', sa.String(50), nullable=True, server_default='folder-kanban'),
        sa.Column('color', sa.String(50), nullable=True, server_default='indigo'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('company_id', 'name', name='uq_projects_company_name'),
    )

    # Create indexes
    op.create_index('ix_projects_company_id', 'projects', ['company_id'], unique=False)
    op.create_index('ix_projects_status', 'projects', ['status'], unique=False)
    op.create_index('ix_projects_created_by', 'projects', ['created_by'], unique=False)
    op.create_index('ix_projects_company_status_created', 'projects', ['company_id', 'status', 'created_at'], unique=False)
    op.create_index('ix_projects_company_created', 'projects', ['company_id', 'created_at', 'id'], unique=False)


def downgrade() -> None:
    """Drop projects table, indexes, and enum."""
    op.drop_index('ix_projects_company_created', table_name='projects')
    op.drop_index('ix_projects_company_status_created', table_name='projects')
    op.drop_index('ix_projects_created_by', table_name='projects')
    op.drop_index('ix_projects_status', table_name='projects')
    op.drop_index('ix_projects_company_id', table_name='projects')
    op.drop_table('projects')

    op.execute("DROP TYPE IF EXISTS project_status CASCADE;")
