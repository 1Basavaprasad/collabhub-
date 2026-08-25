"""create_project_teams_and_project_members

Revision ID: 3d8194e1b8c2
Revises: 7a19284e1b8c
Create Date: 2026-08-25 21:37:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3d8194e1b8c2'
down_revision: Union[str, Sequence[str], None] = '7a19284e1b8c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create project_teams and project_members tables with foreign keys and indexes."""
    # 1. Create project_teams table
    op.create_table(
        'project_teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('project_id', 'team_id', name='uq_project_teams_project_team'),
    )
    op.create_index('ix_project_teams_project_id', 'project_teams', ['project_id'])
    op.create_index('ix_project_teams_team_id', 'project_teams', ['team_id'])
    op.create_index('ix_project_teams_project_created', 'project_teams', ['project_id', 'created_at'])

    # 2. Create project_members table
    op.create_table(
        'project_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('project_id', 'user_id', name='uq_project_members_project_user'),
    )
    op.create_index('ix_project_members_project_id', 'project_members', ['project_id'])
    op.create_index('ix_project_members_user_id', 'project_members', ['user_id'])
    op.create_index('ix_project_members_project_created', 'project_members', ['project_id', 'created_at'])


def downgrade() -> None:
    """Drop project_members and project_teams tables."""
    op.drop_index('ix_project_members_project_created', table_name='project_members')
    op.drop_index('ix_project_members_user_id', table_name='project_members')
    op.drop_index('ix_project_members_project_id', table_name='project_members')
    op.drop_table('project_members')

    op.drop_index('ix_project_teams_project_created', table_name='project_teams')
    op.drop_index('ix_project_teams_team_id', table_name='project_teams')
    op.drop_index('ix_project_teams_project_id', table_name='project_teams')
    op.drop_table('project_teams')
