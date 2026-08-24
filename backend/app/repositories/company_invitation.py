import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.company_invitation import (
    CompanyInvitation,
    InvitationStatus,
)
from app.models.company_member import CompanyRole


def create_invitation(
    db: Session,
    company_id: uuid.UUID,
    email: str,
    role: CompanyRole,
    token_hash: str,
    invited_by: uuid.UUID,
    expires_at: datetime,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyInvitation:
    invitation = CompanyInvitation(
        company_id=company_id,
        email=email,
        role=role,
        token_hash=token_hash,
        status=InvitationStatus.PENDING,
        invited_by=invited_by,
        expires_at=expires_at,
        designation=designation,
        department=department,
    )

    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return invitation


def get_invitation_by_token_hash(
    db: Session,
    token_hash: str,
) -> CompanyInvitation | None:
    return db.scalar(
        select(CompanyInvitation).where(
            CompanyInvitation.token_hash == token_hash
        )
    )


def get_pending_invitation_by_token_hash(
    db: Session,
    token_hash: str,
) -> CompanyInvitation | None:
    return db.scalar(
        select(CompanyInvitation)
        .options(
            joinedload(CompanyInvitation.company)
        )
        .where(
            CompanyInvitation.token_hash == token_hash,
            CompanyInvitation.status == InvitationStatus.PENDING,
        )
    )


def get_pending_invitation(
    db: Session,
    company_id: uuid.UUID,
    email: str,
) -> CompanyInvitation | None:
    return db.scalar(
        select(CompanyInvitation).where(
            CompanyInvitation.company_id == company_id,
            CompanyInvitation.email == email,
            CompanyInvitation.status == InvitationStatus.PENDING,
        )
    )


def get_invitation_by_id(
    db: Session,
    invitation_id: uuid.UUID,
) -> CompanyInvitation | None:
    return db.scalar(
        select(CompanyInvitation).where(
            CompanyInvitation.id == invitation_id
        )
    )


def mark_invitation_accepted(
    db: Session,
    invitation: CompanyInvitation,
    accepted_at: datetime,
) -> CompanyInvitation:
    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = accepted_at

    db.commit()
    db.refresh(invitation)

    return invitation


def mark_invitation_revoked(
    db: Session,
    invitation: CompanyInvitation,
) -> CompanyInvitation:
    invitation.status = InvitationStatus.REVOKED

    db.commit()
    db.refresh(invitation)

    return invitation


def mark_invitation_expired(
    db: Session,
    invitation: CompanyInvitation,
) -> CompanyInvitation:
    invitation.status = InvitationStatus.EXPIRED

    db.commit()
    db.refresh(invitation)

    return invitation


def get_company_invitations(
    db: Session,
    company_id: uuid.UUID,
) -> list[CompanyInvitation]:
    return list(
        db.scalars(
            select(CompanyInvitation)
            .where(
                CompanyInvitation.company_id == company_id
            )
            .order_by(
                CompanyInvitation.created_at.desc()
            )
        ).all()
    )