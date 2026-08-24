import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.company_invitation import CompanyInvitation, InvitationStatus
from app.models.company_member import CompanyRole
from app.repositories.company import (
    add_company_member,
    get_company_by_id,
    get_company_membership,
)
from app.repositories.company_invitation import (
    create_invitation,
    get_company_invitations,
    get_invitation_by_id,
    get_pending_invitation,
    get_pending_invitation_by_token_hash,
    mark_invitation_accepted,
    mark_invitation_expired,
    mark_invitation_revoked,
)
from app.repositories.user import get_user_by_email, get_user_by_id
from app.services.email import send_company_invitation_email


INVITATION_EXPIRE_HOURS = 72


def _hash_invitation_token(token: str) -> str:
    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def create_company_invitation_service(
    db: Session,
    company_id: uuid.UUID,
    inviter_user_id: uuid.UUID,
    email: str,
    role: CompanyRole = CompanyRole.MEMBER,
    designation: str | None = None,
    department: str | None = None,
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

    # 3. Retrieve company details
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    # 4. Normalize email
    normalized_email = email.strip().lower()

    # 5. Check whether the user already exists and is a member
    existing_user = get_user_by_email(
        db,
        normalized_email,
    )

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

    # 6. Prevent duplicate pending invitations (or auto-expire if past validity)
    existing_invitation = get_pending_invitation(
        db,
        company_id,
        normalized_email,
    )

    if existing_invitation:
        now = datetime.now(timezone.utc)
        if existing_invitation.expires_at <= now:
            mark_invitation_expired(db, existing_invitation)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A pending invitation already exists for this email.",
            )

    # 7. Generate secure random raw invitation token
    raw_token = secrets.token_urlsafe(32)

    # 8. Store only the hash in database
    token_hash = _hash_invitation_token(raw_token)

    # 9. Invitation expires after 72 hours
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=INVITATION_EXPIRE_HOURS
    )

    # 10. Normalize optional organization information
    normalized_designation = (
        designation.strip()
        if designation and designation.strip()
        else None
    )

    normalized_department = (
        department.strip()
        if department and department.strip()
        else None
    )

    # 11. Create invitation record in database
    invitation = create_invitation(
        db=db,
        company_id=company_id,
        email=normalized_email,
        role=role,
        token_hash=token_hash,
        invited_by=inviter_user_id,
        expires_at=expires_at,
        designation=normalized_designation,
        department=normalized_department,
    )

    # 12. Build frontend invitation acceptance URL with raw token
    frontend_base_url = settings.FRONTEND_URL.rstrip("/")
    invitation_url = f"{frontend_base_url}/invitations/accept?token={raw_token}"

    # 13. Retrieve inviter user information for display
    inviter = get_user_by_id(db, inviter_user_id)
    inviter_display = (
        inviter.full_name
        if inviter and inviter.full_name
        else (inviter.username if inviter and inviter.username else "A team member")
    )

    role_str = role.value if hasattr(role, "value") else str(role)

    # 14. Send email via SMTP
    try:
        send_company_invitation_email(
            recipient_email=normalized_email,
            company_name=company.name,
            inviter_name=inviter_display,
            role=role_str,
            invitation_url=invitation_url,
            expires_at=expires_at,
            designation=normalized_designation,
            department=normalized_department,
        )
    except Exception as e:
        # Roll back invitation from database on delivery failure
        db.delete(invitation)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invitation could not be delivered. Please verify your SMTP settings or try again.",
        )

    # Return raw token separately (for programmatic/test usage if needed)
    return invitation, raw_token


def verify_company_invitation_service(
    db: Session,
    raw_token: str,
):
    """
    Verify an invitation token without accepting it.

    Used when a user opens an invitation link.
    """

    if not raw_token or not raw_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation token is required.",
        )

    token_hash = _hash_invitation_token(
        raw_token.strip()
    )

    invitation = get_pending_invitation_by_token_hash(
        db,
        token_hash,
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or is no longer pending.",
        )

    now = datetime.now(timezone.utc)

    # Handle expired invitation
    if invitation.expires_at <= now:
        mark_invitation_expired(
            db,
            invitation,
        )

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This invitation has expired.",
        )

    # Load company
    company = get_company_by_id(
        db,
        invitation.company_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company associated with this invitation no longer exists.",
        )

    return invitation, company


def accept_company_invitation_service(
    db: Session,
    raw_token: str,
    user_id: uuid.UUID,
) -> CompanyInvitation:
    """
    Accept an invitation for the currently authenticated user.

    The invitation email must match the authenticated user's email.
    """

    if not raw_token or not raw_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation token is required.",
        )

    # 1. Hash the raw token
    token_hash = _hash_invitation_token(
        raw_token.strip()
    )

    # 2. Find pending invitation
    invitation = get_pending_invitation_by_token_hash(
        db,
        token_hash,
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or is no longer pending.",
        )

    # 3. Check expiration
    now = datetime.now(timezone.utc)

    if invitation.expires_at <= now:
        mark_invitation_expired(
            db,
            invitation,
        )

        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This invitation has expired.",
        )

    # 4. Get authenticated user
    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # 5. Verify invitation belongs to authenticated email
    if user.email.strip().lower() != invitation.email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address.",
        )

    # 6. Make sure user isn't already a member
    existing_membership = get_company_membership(
        db,
        invitation.company_id,
        user.id,
    )

    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this company.",
        )

    # 7. Make sure company still exists
    company = get_company_by_id(
        db,
        invitation.company_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company associated with this invitation no longer exists.",
        )

    # 8. Create company membership
    try:
        add_company_member(
            db=db,
            company_id=invitation.company_id,
            user_id=user.id,
            role=invitation.role,
            designation=invitation.designation,
            department=invitation.department,
        )

    except Exception:
        db.rollback()
        raise

    # 9. Mark invitation as accepted
    accepted_invitation = mark_invitation_accepted(
        db=db,
        invitation=invitation,
        accepted_at=now,
    )

    return accepted_invitation


def get_company_invitations_service(
    db: Session,
    company_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
) -> list[CompanyInvitation]:
    """
    Get all invitations for a company.

    Only OWNER and ADMIN of the company can access invitations.
    """

    membership = get_company_membership(
        db,
        company_id,
        requesting_user_id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can view invitations.",
        )

    invitations = get_company_invitations(db, company_id)

    # Check and update any expired pending invitations
    now = datetime.now(timezone.utc)
    for inv in invitations:
        if inv.status == InvitationStatus.PENDING and inv.expires_at <= now:
            mark_invitation_expired(db, inv)

    return invitations


def revoke_company_invitation_service(
    db: Session,
    company_id: uuid.UUID,
    invitation_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
) -> CompanyInvitation:
    """
    Revoke a pending invitation.

    Only OWNER and ADMIN can revoke invitations.
    """

    membership = get_company_membership(
        db,
        company_id,
        requesting_user_id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can revoke invitations.",
        )

    invitation = get_invitation_by_id(db, invitation_id)

    if not invitation or invitation.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found.",
        )

    if invitation.status == InvitationStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has already been revoked.",
        )

    if invitation.status == InvitationStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke an invitation that has already been accepted.",
        )

    now = datetime.now(timezone.utc)
    if invitation.status == InvitationStatus.PENDING and invitation.expires_at <= now:
        mark_invitation_expired(db, invitation)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revoke an expired invitation.",
        )

    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending invitations can be revoked.",
        )

    revoked_invitation = mark_invitation_revoked(db, invitation)
    return revoked_invitation