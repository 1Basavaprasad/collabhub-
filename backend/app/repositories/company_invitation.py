import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
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


def get_invitation_by_token_hash_for_update(
    db: Session,
    token_hash: str,
) -> CompanyInvitation | None:
    return db.scalar(
        select(CompanyInvitation)
        .where(
            CompanyInvitation.token_hash == token_hash
        )
        .with_for_update()
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
            func.lower(CompanyInvitation.email) == email.strip().lower(),
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
    page: int = 1,
    limit: int = 20,
    status: InvitationStatus | None = None,
    search: str | None = None,
) -> tuple[list[CompanyInvitation], int]:
    base_query = select(CompanyInvitation).where(
        CompanyInvitation.company_id == company_id
    )

    if status is not None:
        base_query = base_query.where(CompanyInvitation.status == status)

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                CompanyInvitation.email.ilike(term),
                CompanyInvitation.designation.ilike(term),
                CompanyInvitation.department.ilike(term),
            )
        )

    count_statement = select(func.count()).select_from(base_query.subquery())
    total = db.execute(count_statement).scalar_one()

    items_statement = (
        base_query
        .order_by(CompanyInvitation.created_at.desc(), CompanyInvitation.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = list(db.scalars(items_statement).all())
    return items, total


def get_pending_invitations_for_user_email(
    db: Session,
    email: str,
) -> list[CompanyInvitation]:
    now = datetime.now()
    return list(
        db.scalars(
            select(CompanyInvitation)
            .options(
                joinedload(CompanyInvitation.company),
                joinedload(CompanyInvitation.invited_by_user),
            )
            .where(
                func.lower(CompanyInvitation.email) == email.strip().lower(),
                CompanyInvitation.status == InvitationStatus.PENDING,
                CompanyInvitation.expires_at > now,
            )
            .order_by(CompanyInvitation.created_at.desc())
        ).all()
    )


def mark_invitation_declined(
    db: Session,
    invitation: CompanyInvitation,
) -> CompanyInvitation:
    invitation.status = InvitationStatus.DECLINED
    db.commit()
    db.refresh(invitation)
    return invitation