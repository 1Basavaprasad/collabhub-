"""create_company_invitations

Revision ID: 7598449ac1d4
Revises: fb116db8e737
Create Date: 2026-08-24 11:53:25.970808

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7598449ac1d4"
down_revision: Union[str, Sequence[str], None] = "fb116db8e737"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ---------------------------------------------------------
    # 1. Make sure invitation_status exists.
    # ---------------------------------------------------------
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'invitation_status'
            ) THEN
                CREATE TYPE invitation_status AS ENUM (
                    'PENDING',
                    'ACCEPTED',
                    'EXPIRED',
                    'REVOKED'
                );
            END IF;
        END
        $$;
        """
    )

    # ---------------------------------------------------------
    # 2. Create company_invitations table.
    #
    # company_role already exists.
    # invitation_status already exists after step 1.
    # We use PostgreSQL type names directly instead of
    # SQLAlchemy Enum objects, so SQLAlchemy will NOT try
    # to CREATE either enum again.
    # ---------------------------------------------------------
    op.execute(
        """
        CREATE TABLE company_invitations (
            id UUID NOT NULL,
            company_id UUID NOT NULL,
            email VARCHAR(255) NOT NULL,
            role company_role NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            status invitation_status NOT NULL,
            invited_by UUID NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            accepted_at TIMESTAMP WITH TIME ZONE NULL,
            created_at TIMESTAMP WITH TIME ZONE
                DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE
                DEFAULT now() NOT NULL,

            CONSTRAINT company_invitations_pkey
                PRIMARY KEY (id),

            CONSTRAINT company_invitations_company_id_fkey
                FOREIGN KEY (company_id)
                REFERENCES companies(id)
                ON DELETE CASCADE,

            CONSTRAINT company_invitations_invited_by_fkey
                FOREIGN KEY (invited_by)
                REFERENCES users(id)
                ON DELETE CASCADE
        );
        """
    )

    # ---------------------------------------------------------
    # 3. Indexes
    # ---------------------------------------------------------
    op.create_index(
        "ix_company_invitations_company_id",
        "company_invitations",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_company_invitations_email",
        "company_invitations",
        ["email"],
        unique=False,
    )

    op.create_index(
        "ix_company_invitations_invited_by",
        "company_invitations",
        ["invited_by"],
        unique=False,
    )

    op.create_index(
        "ix_company_invitations_status",
        "company_invitations",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_company_invitations_token_hash",
        "company_invitations",
        ["token_hash"],
        unique=True,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        "ix_company_invitations_token_hash",
        table_name="company_invitations",
    )

    op.drop_index(
        "ix_company_invitations_status",
        table_name="company_invitations",
    )

    op.drop_index(
        "ix_company_invitations_invited_by",
        table_name="company_invitations",
    )

    op.drop_index(
        "ix_company_invitations_email",
        table_name="company_invitations",
    )

    op.drop_index(
        "ix_company_invitations_company_id",
        table_name="company_invitations",
    )

    op.drop_table("company_invitations")

    # company_role MUST NOT be dropped.
    # It belongs to company_members.

    op.execute(
        """
        DROP TYPE IF EXISTS invitation_status;
        """
    )