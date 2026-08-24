import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company_invitation import CompanyInvitation
from app.models.company_member import CompanyRole
from app.repositories.company import get_company_membership
from app.repositories.company_invitation import (
    create_invitation,
    get_pending_invitation,
)
from app.repositories.user import get_user_by_email


INVITATION_EXPIRE_HOURS = 72


def _hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_company_invitation_service(
    db: Session,
    company_id: uuid.UUID,
    inviter_user_id: uuid.UUID,
    email: str,
    role: CompanyRole = CompanyRole.MEMBER,
) -> tuple[CompanyInvitation, str]:

    # 1. Check inviter's company membership
    inviter_membership = get_company_membership(
        db,
        company_id,
        inviter_user_id,
    )

    if not inviter_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this company.",
        )

    # 2. Only OWNER and ADMIN can invite members
    if inviter_membership.role not in (
        CompanyRole.OWNER,
        CompanyRole.ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can invite members.",
        )

    # 3. Normalize email
    normalized_email = email.strip().lower()

    # 4. Check whether the user already exists
    existing_user = get_user_by_email(
        db,
        normalized_email,
    )

    # 5. If user exists, check whether they are already a member
    if existing_user:
        existing_membership = get_company_membership(
            db,
            company_id,
            existing_user.id,
        )

        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user is already a member of the company.",
            )

    # 6. Prevent duplicate pending invitations
    existing_invitation = get_pending_invitation(
        db,
        company_id,
        normalized_email,
    )

    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending invitation already exists for this email.",
        )

    # 7. Generate secure random invitation token
    raw_token = secrets.token_urlsafe(32)

    # 8. Store only the hash in the database
    token_hash = _hash_invitation_token(raw_token)

    # 9. Invitation expires after 72 hours
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=INVITATION_EXPIRE_HOURS
    )

    # 10. Create database invitation
    invitation = create_invitation(
        db=db,
        company_id=company_id,
        email=normalized_email,
        role=role,
        token_hash=token_hash,
        invited_by=inviter_user_id,
        expires_at=expires_at,
    )

    # Return raw token separately.
    # It will later be placed inside the email invitation link.
    return invitation, raw_token