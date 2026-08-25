"""add_query_performance_indexes

Revision ID: 6e725b73bab4
Revises: 4c57821cc4ef
Create Date: 2026-08-25 11:44:30.685889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e725b73bab4'
down_revision: Union[str, Sequence[str], None] = '4c57821cc4ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add targeted composite indexes for query optimization and pagination."""
    # 1. company_members
    op.create_index(
        'ix_company_members_company_joined',
        'company_members',
        ['company_id', 'joined_at', 'id'],
        unique=False,
    )
    op.create_index(
        'ix_company_members_company_role',
        'company_members',
        ['company_id', 'role'],
        unique=False,
    )

    # 2. company_invitations
    op.create_index(
        'ix_company_invitations_company_created',
        'company_invitations',
        ['company_id', 'created_at', 'id'],
        unique=False,
    )
    op.create_index(
        'ix_company_invitations_company_status',
        'company_invitations',
        ['company_id', 'status'],
        unique=False,
    )

    # 3. teams
    op.create_index(
        'ix_teams_company_archived_created',
        'teams',
        ['company_id', 'is_archived', 'created_at'],
        unique=False,
    )

    # 4. team_members
    op.create_index(
        'ix_team_members_team_joined',
        'team_members',
        ['team_id', 'joined_at', 'id'],
        unique=False,
    )
    op.create_index(
        'ix_team_members_team_role',
        'team_members',
        ['team_id', 'role'],
        unique=False,
    )

    # 5. team_activities
    op.create_index(
        'ix_team_activities_team_created',
        'team_activities',
        ['team_id', 'created_at', 'id'],
        unique=False,
    )


def downgrade() -> None:
    """Drop targeted composite indexes."""
    op.drop_index('ix_team_activities_team_created', table_name='team_activities')
    op.drop_index('ix_team_members_team_role', table_name='team_members')
    op.drop_index('ix_team_members_team_joined', table_name='team_members')
    op.drop_index('ix_teams_company_archived_created', table_name='teams')
    op.drop_index('ix_company_invitations_company_status', table_name='company_invitations')
    op.drop_index('ix_company_invitations_company_created', table_name='company_invitations')
    op.drop_index('ix_company_members_company_role', table_name='company_members')
    op.drop_index('ix_company_members_company_joined', table_name='company_members')
