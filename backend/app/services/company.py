import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.company import Company
from app.models.company_invitation import CompanyInvitation, InvitationStatus
from app.models.company_member import CompanyMember, CompanyRole
from app.models.team import Team
from app.models.team_activity import TeamActivity
from app.models.team_member import TeamMember, TeamRole
from app.repositories.company import (
    add_company_member,
    count_company_owners,
    create_company,
    get_active_or_first_company_for_user,
    get_companies_for_user,
    get_company_by_id,
    get_company_members,
    get_company_membership,
    get_company_membership_for_update,
    lock_company_for_update,
    remove_company_member,
    soft_delete_company,
    update_company,
    update_company_member,
)
from app.repositories.team import count_team_leads, get_team_members


def create_company_service(
    db: Session,
    name: str,
    description: str | None,
    creator_user_id: uuid.UUID,
    industry: str | None = None,
    company_size: str | None = None,
    country: str | None = None,
    city: str | None = None,
    website: str | None = None,
    logo_url: str | None = None,
    creator_designation: str | None = None,
    creator_department: str | None = None,
) -> Company:
    return create_company(
        db=db,
        name=name,
        description=description,
        creator_user_id=creator_user_id,
        industry=industry,
        company_size=company_size,
        country=country,
        city=city,
        website=website,
        logo_url=logo_url,
        creator_designation=creator_designation,
        creator_department=creator_department,
    )


def get_my_company(
    db: Session,
    user_id: uuid.UUID,
) -> Company:
    company = get_active_or_first_company_for_user(
        db,
        user_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not belong to any company.",
        )

    return company


def get_my_companies_list(
    db: Session,
    user_id: uuid.UUID,
) -> list[Company]:
    return get_companies_for_user(db, user_id)


def get_company_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Company:
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        company = get_company_by_id(db, company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    return membership.company or get_company_by_id(db, company_id)


def update_company_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str | None = None,
    description: str | None = None,
    industry: str | None = None,
    company_size: str | None = None,
    country: str | None = None,
    city: str | None = None,
    website: str | None = None,
    logo_url: str | None = None,
) -> Company:
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        company = get_company_by_id(db, company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can update company settings.",
        )

    company = membership.company or get_company_by_id(db, company_id)
    return update_company(
        db=db,
        company=company,
        name=name,
        description=description,
        industry=industry,
        company_size=company_size,
        country=country,
        city=city,
        website=website,
        logo_url=logo_url,
    )


def add_member_to_company_service(
    db: Session,
    company_id: uuid.UUID,
    current_user_id: uuid.UUID,
    new_user_id: uuid.UUID,
    role: CompanyRole = CompanyRole.MEMBER,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyMember:
    # Check current user is owner or admin
    membership = get_company_membership(db, company_id, current_user_id)
    if not membership or membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can add members.",
        )

    if role == CompanyRole.OWNER and membership.role != CompanyRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can add members with the owner role.",
        )

    existing = get_company_membership(db, company_id, new_user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this company.",
        )

    return add_company_member(
        db=db,
        company_id=company_id,
        user_id=new_user_id,
        role=role,
        designation=designation.strip() if designation and designation.strip() else None,
        department=department.strip() if department and department.strip() else None,
    )


def get_company_members_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    role: CompanyRole | None = None,
    department: str | None = None,
    search: str | None = None,
) -> tuple[list[CompanyMember], int]:
    # User must be a member of the company to view its members
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        company = get_company_by_id(db, company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    return get_company_members(
        db=db,
        company_id=company_id,
        page=page,
        limit=limit,
        role=role,
        department=department,
        search=search,
    )


def update_company_member_service(
    db: Session,
    company_id: uuid.UUID,
    target_user_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
    role: CompanyRole | None = None,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyMember:
    # 1. Check requesting user membership
    requesting_membership = get_company_membership(db, company_id, requesting_user_id)
    if not requesting_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    # 2. Acquire lock on company to serialize role/owner modifications
    lock_company_for_update(db, company_id)

    # 3. Check target user membership
    target_membership = get_company_membership(db, company_id, target_user_id)
    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this company.",
        )

    # 4. Role-based permission checks
    if requesting_membership.role == CompanyRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members cannot modify company members.",
        )

    if requesting_membership.role == CompanyRole.ADMIN:
        if target_membership.role == CompanyRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot modify company owners.",
            )
        if role == CompanyRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot promote members to owner.",
            )

    if requesting_membership.role == CompanyRole.OWNER:
        # Prevent demoting the last owner
        if target_membership.role == CompanyRole.OWNER and role is not None and role != CompanyRole.OWNER:
            owners_count = count_company_owners(db, company_id)
            if owners_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Company must have at least one owner.",
                )

    return update_company_member(
        db=db,
        membership=target_membership,
        role=role,
        designation=designation,
        department=department,
    )


def _clean_up_user_company_teams(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    reason: str,
) -> None:
    """
    Remove the user from all teams belonging strictly to the specified company.
    Enforces team lead constraint: if the user is the ONLY lead of a team with > 1 total members,
    rejects the departure/removal to prevent an orphan team with active members.
    """
    statement = (
        select(TeamMember)
        .join(Team, TeamMember.team_id == Team.id)
        .options(joinedload(TeamMember.team))
        .where(
            Team.company_id == company_id,
            TeamMember.user_id == user_id,
        )
    )
    team_members = list(db.execute(statement).scalars().all())

    # 1. Validate team lead constraints across all affected teams in this company
    for tm in team_members:
        if tm.role == TeamRole.LEAD:
            leads_count = count_team_leads(db, tm.team_id)
            total_members = len(get_team_members(db, tm.team_id))
            if leads_count <= 1 and total_members > 1:
                team_name = tm.team.name if tm.team else "a team"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot remove member who is the only lead of team '{team_name}'. Please reassign team leadership first.",
                )

    # 2. Delete team memberships and log team activity
    for tm in team_members:
        db.delete(tm)
        activity = TeamActivity(
            team_id=tm.team_id,
            actor_user_id=actor_user_id,
            action="MEMBER_REMOVED",
            details=f"Member removed from team due to company {reason}.",
        )
        db.add(activity)


def remove_member_from_company_service(
    db: Session,
    company_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> dict:
    """
    Remove a member from a company (OWNER/ADMIN only).
    Self-removal must use the dedicated leave endpoint.
    Atomic: cleans up company membership, cleans up team memberships in this company, and protects the last owner.
    """
    # 1. Prevent self-removal via admin endpoint
    if requesting_user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself using the admin removal endpoint. Use the leave company endpoint instead.",
        )

    # 2. Verify company existence and lock row for atomic serialization
    company = lock_company_for_update(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    # 3. Check requesting user membership & permissions
    requesting_membership = get_company_membership(db, company_id, requesting_user_id)
    if not requesting_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    if requesting_membership.role == CompanyRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members cannot remove company members.",
        )

    # 4. Check target user membership
    target_membership = get_company_membership(db, company_id, target_user_id)
    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this company.",
        )

    # 5. Permission checks for ADMIN requesting user
    if requesting_membership.role == CompanyRole.ADMIN:
        if target_membership.role == CompanyRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot remove company owners.",
            )

    # 6. Last owner protection
    if target_membership.role == CompanyRole.OWNER:
        owners_count = count_company_owners(db, company_id)
        if owners_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company must have at least one owner.",
            )

    # 7. Atomically clean up team memberships in this company and check team lead rules
    _clean_up_user_company_teams(
        db=db,
        company_id=company_id,
        user_id=target_user_id,
        actor_user_id=requesting_user_id,
        reason="member removal",
    )

    # 8. Remove company membership and commit atomically
    db.delete(target_membership)
    db.commit()

    return {
        "message": "Member removed from company successfully.",
        "company_id": str(company_id),
        "user_id": str(target_user_id),
    }


def leave_company_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict:
    """
    Allow the authenticated user to leave a company.
    Last owner cannot leave unless another owner exists.
    Atomic: cleans up company membership and team memberships in this company.
    """
    # 1. Verify company existence and lock row for atomic serialization
    company = lock_company_for_update(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    # 2. Check user membership
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this company.",
        )

    # 3. Last owner protection
    if membership.role == CompanyRole.OWNER:
        owners_count = count_company_owners(db, company_id)
        if owners_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot leave company as the only owner. Transfer ownership or assign another owner first.",
            )

    # 4. Atomically clean up team memberships in this company and check team lead rules
    _clean_up_user_company_teams(
        db=db,
        company_id=company_id,
        user_id=user_id,
        actor_user_id=user_id,
        reason="departure",
    )

    # 5. Remove company membership and commit atomically
    db.delete(membership)
    db.commit()

    return {
        "message": "Successfully left the company.",
        "company_id": str(company_id),
        "user_id": str(user_id),
    }


def delete_company_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict:
    """
    Soft-delete a company workspace (OWNER only).
    Atomic transaction:
      1. Locks company row with FOR UPDATE.
      2. Validates company exists and is not already deleted (404).
      3. Validates user is an OWNER of the company (403 if ADMIN/MEMBER).
      4. Marks company as deleted (is_deleted=True, deleted_at=now).
      5. Revokes all pending invitations for this company.
      6. Commits transaction atomically.
    Users and historical memberships/teams remain intact.
    """
    # 1. Lock company row (only active companies)
    company = lock_company_for_update(db, company_id)
    if not company or company.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    # 2. Check user membership & permissions
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not belong to this company workspace.",
        )

    if membership.role != CompanyRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can delete the company workspace.",
        )

    # 3. Soft delete company
    now = datetime.now(timezone.utc)
    company.is_deleted = True
    company.deleted_at = now

    # 4. Invalidate / revoke pending invitations
    pending_invitations = list(
        db.execute(
            select(CompanyInvitation).where(
                CompanyInvitation.company_id == company_id,
                CompanyInvitation.status == InvitationStatus.PENDING,
            )
        ).scalars().all()
    )
    for inv in pending_invitations:
        inv.status = InvitationStatus.REVOKED

    # 5. Commit atomically
    db.commit()

    return {
        "message": "Company deleted successfully.",
        "company_id": str(company_id),
    }