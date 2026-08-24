"""create_company_members_and_migrate_ownership

Revision ID: fb116db8e737
Revises: c32434664e1b
Create Date: 2026-08-24 10:59:06.732950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'fb116db8e737'
down_revision: Union[str, Sequence[str], None] = 'c32434664e1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create company_role enum type safely if it does not exist
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_role') THEN
                CREATE TYPE company_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
            END IF;
        END
        $$;
        """
    )

    company_role = postgresql.ENUM(
        "OWNER",
        "ADMIN",
        "MEMBER",
        name="company_role",
        create_type=False,
    )

    # 2. Create company_members table
    op.create_table(
        "company_members",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("role", company_role, nullable=False, server_default="MEMBER"),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
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
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "user_id",
            name="uq_company_members_company_user",
        ),
    )

    op.create_index(
        op.f("ix_company_members_company_id"),
        "company_members",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_company_members_user_id"),
        "company_members",
        ["user_id"],
        unique=False,
    )

    # 3. Data Migration: Copy existing companies.owner_id into company_members with role = 'OWNER'
    op.execute(
        """
        INSERT INTO company_members (id, company_id, user_id, role, joined_at, created_at, updated_at)
        SELECT gen_random_uuid(), id, owner_id, 'OWNER'::company_role, created_at, created_at, created_at
        FROM companies
        WHERE owner_id IS NOT NULL;
        """
    )

    # 4. Drop owner_id constraint and column from companies table
    op.drop_constraint("companies_owner_id_fkey", "companies", type_="foreignkey")
    op.drop_column("companies", "owner_id")


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Recreate owner_id column
    op.add_column("companies", sa.Column("owner_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "companies_owner_id_fkey",
        "companies",
        "users",
        ["owner_id"],
        ["id"],
    )

    # 2. Backfill owner_id from earliest OWNER in company_members
    op.execute(
        """
        UPDATE companies c
        SET owner_id = (
            SELECT cm.user_id
            FROM company_members cm
            WHERE cm.company_id = c.id AND cm.role = 'OWNER'
            ORDER BY cm.created_at ASC
            LIMIT 1
        );
        """
    )

    # 3. Drop company_members table
    op.drop_index(op.f("ix_company_members_user_id"), table_name="company_members")
    op.drop_index(op.f("ix_company_members_company_id"), table_name="company_members")
    op.drop_table("company_members")

    # 4. Drop company_role enum
    op.execute("DROP TYPE IF EXISTS company_role")
