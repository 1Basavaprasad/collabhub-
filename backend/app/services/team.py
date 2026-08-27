import re
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.models.team import Team
from app.models.team_activity import TeamActivity
from app.models.team_member import TeamMember, TeamRole
from app.models.user import User
from app.repositories.company import get_company_by_id, get_company_membership
from app.repositories.team import (
    add_team_member,
    batch_add_team_members,
    count_team_leads,
    create_team,
    delete_team,
    get_company_teams,
    get_team_activities,
    get_team_by_company_and_name,
    get_team_by_id,
    get_team_member,
    get_team_members,
    get_team_members_paginated,
    get_team_simple,
    log_team_activity,
    remove_team_member,
    transfer_team_leadership,
    update_team,
    update_team_member_role,
)
from app.schemas.team import (
    BatchTeamMembersCreate,
    TeamCreate,
    TeamMemberCreate,
    TeamMemberUpdate,
    TeamUpdate,
    TransferLeadershipRequest,
)


def _get_validated_membership(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> tuple[Company, CompanyMember]:
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        company = get_company_by_id(db, company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company workspace not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not belong to this company workspace.",
        )

    return membership.company or get_company_by_id(db, company_id), membership


def _check_team_management_permission(
    db: Session,
    company_membership: CompanyMember,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    if company_membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN):
        return

    # Check if user is a Team LEAD
    team_member = get_team_member(db, team_id, user_id)
    if team_member and team_member.role == TeamRole.LEAD:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only workspace owners, admins, or team leads can manage this team.",
    )


def create_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    data: TeamCreate,
) -> Team:
    company, membership = _get_validated_membership(db, company_id, current_user_id)

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can create new teams.",
        )

    existing_team = get_team_by_company_and_name(db, company_id, data.name)
    if existing_team:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A team named '{data.name.strip()}' already exists in this workspace.",
        )

    return create_team(
        db=db,
        company_id=company_id,
        name=data.name,
        description=data.description,
        creator_user_id=current_user_id,
        icon=data.icon or "users",
        color=data.color or "indigo",
    )


def get_company_teams_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    status_filter: str | None = None,
    my_teams: bool = False,
    search: str | None = None,
    sort_by: str | None = None,
) -> tuple[list[dict], int]:
    _get_validated_membership(db, company_id, current_user_id)

    user_id_filter = current_user_id if my_teams else None
    teams, total = get_company_teams(
        db=db,
        company_id=company_id,
        page=page,
        limit=limit,
        status_filter=status_filter,
        user_id_filter=user_id_filter,
        search=search,
        sort_by=sort_by,
    )

    results = []
    for t in teams:
        leads = [
            m.user for m in t.members if m.role == TeamRole.LEAD and m.user is not None
        ]
        members_preview = [m.user for m in t.members if m.user is not None][:4]
        results.append({
            "id": t.id,
            "company_id": t.company_id,
            "name": t.name,
            "description": t.description,
            "icon": t.icon or "users",
            "color": t.color or "indigo",
            "is_archived": t.is_archived,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "member_count": len(t.members),
            "leads": leads,
            "members_preview": members_preview,
        })

    return results, total


def get_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> dict:
    _get_validated_membership(db, company_id, current_user_id)

    team = get_team_by_id(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    leads = [
        m.user for m in team.members if m.role == TeamRole.LEAD and m.user is not None
    ]
    members_preview = [m.user for m in team.members if m.user is not None][:4]

    return {
        "id": team.id,
        "company_id": team.company_id,
        "name": team.name,
        "description": team.description,
        "icon": team.icon or "users",
        "color": team.color or "indigo",
        "is_archived": team.is_archived,
        "created_at": team.created_at,
        "updated_at": team.updated_at,
        "member_count": len(team.members),
        "leads": leads,
        "members_preview": members_preview,
        "members": team.members,
    }


def update_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamUpdate,
) -> dict:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    team = get_team_by_id(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    _check_team_management_permission(db, membership, team_id, current_user_id)

    if data.name and data.name.strip().lower() != team.name.lower():
        existing_team = get_team_by_company_and_name(db, company_id, data.name)
        if existing_team and existing_team.id != team.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A team named '{data.name.strip()}' already exists in this workspace.",
            )

    updated = update_team(
        db=db,
        team=team,
        name=data.name,
        description=data.description,
        icon=data.icon,
        color=data.color,
        is_archived=data.is_archived,
    )

    log_team_activity(
        db=db,
        team_id=team.id,
        actor_user_id=current_user_id,
        action="TEAM_UPDATED",
        details=f"Team settings were updated.",
    )

    leads = [
        m.user for m in updated.members if m.role == TeamRole.LEAD and m.user is not None
    ]
    members_preview = [m.user for m in updated.members if m.user is not None][:4]

    return {
        "id": updated.id,
        "company_id": updated.company_id,
        "name": updated.name,
        "description": updated.description,
        "icon": updated.icon or "users",
        "color": updated.color or "indigo",
        "is_archived": updated.is_archived,
        "created_at": updated.created_at,
        "updated_at": updated.updated_at,
        "member_count": len(updated.members),
        "leads": leads,
        "members_preview": members_preview,
    }


def archive_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> dict:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can archive teams.",
        )

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    updated = update_team(db=db, team=team, is_archived=True)

    log_team_activity(
        db=db,
        team_id=team.id,
        actor_user_id=current_user_id,
        action="TEAM_ARCHIVED",
        details="Team was archived.",
    )

    return {"message": "Team archived successfully.", "team_id": updated.id, "is_archived": True}


def restore_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> dict:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can restore teams.",
        )

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    updated = update_team(db=db, team=team, is_archived=False)

    log_team_activity(
        db=db,
        team_id=team.id,
        actor_user_id=current_user_id,
        action="TEAM_RESTORED",
        details="Team was restored to active.",
    )

    return {"message": "Team restored successfully.", "team_id": updated.id, "is_archived": False}


def delete_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    if membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can delete teams.",
        )

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    delete_team(db, team)


def get_team_members_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> list[TeamMember]:
    _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    return get_team_members(db, team_id)


def add_team_member_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamMemberCreate,
) -> TeamMember:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    _check_team_management_permission(db, membership, team_id, current_user_id)

    # Validate target user belongs to the company
    target_company_membership = get_company_membership(db, company_id, data.user_id)
    if not target_company_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be an active member of this company workspace before joining a team.",
        )

    # Check if already a member of this team
    existing_team_member = get_team_member(db, team_id, data.user_id)
    if existing_team_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this team.",
        )

    member = add_team_member(
        db=db,
        team_id=team_id,
        user_id=data.user_id,
        role=data.role,
    )

    log_team_activity(
        db=db,
        team_id=team_id,
        actor_user_id=current_user_id,
        action="MEMBER_ADDED",
        details=f"Member added with role {data.role.value}.",
    )

    return member


def batch_add_team_members_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: BatchTeamMembersCreate,
) -> list[TeamMember]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    _check_team_management_permission(db, membership, team_id, current_user_id)

    existing_members = {m.user_id for m in get_team_members(db, team_id)}
    valid_user_ids = []

    for uid in data.user_ids:
        if uid in existing_members:
            continue
        # Verify company membership
        comp_mem = get_company_membership(db, company_id, uid)
        if comp_mem:
            valid_user_ids.append(uid)

    if not valid_user_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid, eligible company members to add.",
        )

    added = batch_add_team_members(
        db=db,
        team_id=team_id,
        user_ids=valid_user_ids,
        role=data.role,
    )

    log_team_activity(
        db=db,
        team_id=team_id,
        actor_user_id=current_user_id,
        action="MEMBER_ADDED",
        details=f"{len(added)} members added to the team.",
    )

    return added


def transfer_leadership_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TransferLeadershipRequest,
) -> dict:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    _check_team_management_permission(db, membership, team_id, current_user_id)

    new_lead_member = get_team_member(db, team_id, data.new_lead_user_id)
    if not new_lead_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The target user must already be a member of this team.",
        )

    # Find the current lead member (if current user is a lead, or primary lead)
    current_lead_member = get_team_member(db, team_id, current_user_id)
    if not current_lead_member or current_lead_member.role != TeamRole.LEAD:
        # If admin is transferring, find any current lead
        leads = [m for m in get_team_members(db, team_id) if m.role == TeamRole.LEAD]
        current_lead_member = leads[0] if leads else None

    transfer_team_leadership(
        db=db,
        team_id=team_id,
        current_lead_member=current_lead_member,
        new_lead_member=new_lead_member,
    )

    target_name = (
        new_lead_member.user.full_name
        or new_lead_member.user.username
        if new_lead_member and new_lead_member.user
        else "team member"
    )

    log_team_activity(
        db=db,
        team_id=team_id,
        actor_user_id=current_user_id,
        action="LEADERSHIP_TRANSFERRED",
        details=f"Team leadership was transferred to {target_name}.",
    )

    return {"message": "Team leadership transferred successfully.", "new_lead_user_id": data.new_lead_user_id}


def update_team_member_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    target_user_id: uuid.UUID,
    data: TeamMemberUpdate,
) -> TeamMember:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    _check_team_management_permission(db, membership, team_id, current_user_id)

    team_member = get_team_member(db, team_id, target_user_id)
    if not team_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found.",
        )

    # If demoting from LEAD to MEMBER, verify at least one other LEAD exists
    if team_member.role == TeamRole.LEAD and data.role != TeamRole.LEAD:
        leads_count = count_team_leads(db, team_id)
        if leads_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the only team lead. Assign another lead first.",
            )

    updated = update_team_member_role(
        db=db,
        team_member=team_member,
        role=data.role,
    )

    log_team_activity(
        db=db,
        team_id=team_id,
        actor_user_id=current_user_id,
        action="ROLE_CHANGED",
        details=f"Role changed to {data.role.value}.",
    )

    return updated


def remove_team_member_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    # User can remove themselves, or an authorized manager can remove them
    is_self_removal = current_user_id == target_user_id
    if not is_self_removal:
        _check_team_management_permission(db, membership, team_id, current_user_id)

    team_member = get_team_member(db, team_id, target_user_id)
    if not team_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found.",
        )

    # If removing a LEAD, verify that it does not leave the team without a lead
    if team_member.role == TeamRole.LEAD:
        leads_count = count_team_leads(db, team_id)
        all_members = get_team_members(db, team_id)
        if leads_count <= 1 and len(all_members) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the only team lead. Assign another lead before removing this member.",
            )

    remove_team_member(db, team_member)

    log_team_activity(
        db=db,
        team_id=team_id,
        actor_user_id=current_user_id,
        action="MEMBER_REMOVED",
        details="Member was removed from the team.",
    )


def get_team_members_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    role: TeamRole | None = None,
    search: str | None = None,
) -> tuple[list[TeamMember], int]:
    _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    return get_team_members_paginated(
        db=db,
        team_id=team_id,
        page=page,
        limit=limit,
        role=role,
        search=search,
    )


def _resolve_activity_details(db: Session, activities: list[TeamActivity]) -> list[TeamActivity]:
    uuid_pattern = re.compile(
        r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
    )

    all_uuids: set[uuid.UUID] = set()
    for act in activities:
        if act.details:
            matches = uuid_pattern.findall(act.details)
            for m in matches:
                try:
                    all_uuids.add(uuid.UUID(m))
                except (ValueError, TypeError):
                    pass

    if not all_uuids:
        return activities

    users_stmt = select(User).where(User.id.in_(all_uuids))
    users = list(db.execute(users_stmt).scalars().all())
    user_map = {str(u.id): (u.full_name or u.username or "member") for u in users if u}

    for act in activities:
        if act.details:
            details_str = act.details
            for uid_str, user_display_name in user_map.items():
                if uid_str in details_str:
                    details_str = re.sub(
                        rf"(?i)\buser\s+{re.escape(uid_str)}\b",
                        user_display_name,
                        details_str,
                    )
                    details_str = details_str.replace(uid_str, user_display_name)
            act.details = details_str

    return activities


def get_team_activity_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[TeamActivity], int]:
    _get_validated_membership(db, company_id, current_user_id)

    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )

    activities, total = get_team_activities(
        db=db,
        team_id=team_id,
        page=page,
        limit=limit,
    )

    activities = _resolve_activity_details(db, activities)

    return activities, total
