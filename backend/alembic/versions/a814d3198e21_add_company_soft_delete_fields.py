"""add_company_soft_delete_fields

Revision ID: a814d3198e21
Revises: 6e725b73bab4
Create Date: 2026-08-25 11:59:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a814d3198e21'
down_revision: Union[str, Sequence[str], None] = '6e725b73bab4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_deleted and deleted_at columns and performance index to companies table."""
    op.add_column(
        'companies',
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.add_column(
        'companies',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        'ix_companies_is_deleted',
        'companies',
        ['is_deleted'],
        unique=False,
    )
    op.create_index(
        'ix_companies_is_deleted_created_at',
        'companies',
        ['is_deleted', 'created_at'],
        unique=False,
    )


def downgrade() -> None:
    """Remove is_deleted, deleted_at and associated indexes."""
    op.drop_index('ix_companies_is_deleted_created_at', table_name='companies')
    op.drop_index('ix_companies_is_deleted', table_name='companies')
    op.drop_column('companies', 'deleted_at')
    op.drop_column('companies', 'is_deleted')
