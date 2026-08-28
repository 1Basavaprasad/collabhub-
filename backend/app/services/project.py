import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember
from app.models.project_team import ProjectTeam
from app.repositories.company import get_company_by_id, get_company_membership
import re
from sqlalchemy import select
from app.models.project_activity import ProjectActivity
from app.models.user import User
from app.repositories.project import (
    add_project_member,
    add_project_team,
    create_project,
    delete_project,
    get_company_projects,
    get_effective_project_members,
    get_project_activities,
    get_project_by_company_and_name,
    get_project_by_id,
    get_project_member,
    get_project_simple,
    get_project_team,
    is_user_effective_project_member,
    list_project_members,
    list_project_teams,
    log_project_activity,
    remove_project_member,
    remove_project_team,
    update_project,
)
from app.repositories.team import get_team_simple
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberAssign,
    ProjectTeamAssign,
    ProjectUpdate,
)
from app.services.notification import notify_project_member_added


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


def _check_project_management_permission(
    company_membership: CompanyMember,
) -> None:
    if company_membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can manage projects.",
        )


def _can_manage_project(
    company_membership: CompanyMember,
    project: Project,
    user_id: uuid.UUID,
) -> bool:
    if company_membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN):
        return True
    if project.created_by == user_id:
        return True
    return False


def _can_access_project(
    db: Session,
    company_membership: CompanyMember,
    project: Project,
    user_id: uuid.UUID,
) -> bool:
    if _can_manage_project(company_membership, project, user_id):
        return True
    return is_user_effective_project_member(db, project.id, user_id)


def create_project_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    data: ProjectCreate,
) -> Project:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    existing_project = get_project_by_company_and_name(db, company_id, data.name)
    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A project named '{data.name.strip()}' already exists in this workspace.",
        )

    return create_project(
        db=db,
        company_id=company_id,
        name=data.name,
        description=data.description,
        created_by_user_id=current_user_id,
        icon=data.icon or "folder-kanban",
        color=data.color or "indigo",
    )


def get_company_projects_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    sort_by: str | None = None,
) -> tuple[list[Project], int]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    user_filter_id = (
        current_user_id if membership.role == CompanyRole.MEMBER else None
    )

    return get_company_projects(
        db=db,
        company_id=company_id,
        page=page,
        limit=limit,
        status_filter=status_filter,
        search=search,
        sort_by=sort_by,
        user_id=user_filter_id,
    )


def get_project_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> Project:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    project = get_project_by_id(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view this project.",
        )

    return project


def update_project_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectUpdate,
) -> Project:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_by_id(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    if data.name and data.name.strip().lower() != project.name.lower():
        existing_project = get_project_by_company_and_name(db, company_id, data.name)
        if existing_project and existing_project.id != project.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A project named '{data.name.strip()}' already exists in this workspace.",
            )

    archived_at = None
    clear_archived_at = False
    if data.status is not None:
        if data.status == ProjectStatus.ARCHIVED and project.status != ProjectStatus.ARCHIVED:
            archived_at = datetime.now(timezone.utc)
        elif data.status == ProjectStatus.ACTIVE and project.status != ProjectStatus.ACTIVE:
            clear_archived_at = True

    return update_project(
        db=db,
        project=project,
        name=data.name,
        description=data.description,
        icon=data.icon,
        color=data.color,
        status=data.status,
        archived_at=archived_at,
        clear_archived_at=clear_archived_at,
    )


def archive_project_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> dict:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    updated = update_project(
        db=db,
        project=project,
        status=ProjectStatus.ARCHIVED,
        archived_at=datetime.now(timezone.utc),
    )

    return {
        "message": "Project archived successfully.",
        "project_id": updated.id,
        "status": updated.status.value,
        "archived_at": updated.archived_at,
    }


def restore_project_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> dict:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    updated = update_project(
        db=db,
        project=project,
        status=ProjectStatus.ACTIVE,
        clear_archived_at=True,
    )

    return {
        "message": "Project restored successfully.",
        "project_id": updated.id,
        "status": updated.status.value,
        "archived_at": None,
    }


def delete_project_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    delete_project(db, project)


# ============================================================================
# Project Teams Services
# ============================================================================


def add_project_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectTeamAssign,
) -> ProjectTeam:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    team = get_team_simple(db, data.team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team must belong to this company workspace.",
        )

    existing = get_project_team(db, project_id, data.team_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team is already assigned to this project.",
        )

    return add_project_team(db, project_id, data.team_id)


def list_project_teams_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> list[ProjectTeam]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view this project's teams.",
        )

    return list_project_teams(db, project_id)


def remove_project_team_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    project_team = get_project_team(db, project_id, team_id)
    if not project_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team is not assigned to this project.",
        )

    remove_project_team(db, project_id, team_id)


# ============================================================================
# Project Direct Members Services
# ============================================================================


def add_project_member_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectMemberAssign,
) -> ProjectMember:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    target_membership = get_company_membership(db, company_id, data.user_id)
    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be an active member of this company workspace before joining a project.",
        )

    existing = get_project_member(db, project_id, data.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a direct member of this project.",
        )

    member = add_project_member(db, project_id, data.user_id)

    try:
        notify_project_member_added(
            db=db,
            project_id=project.id,
            project_name=project.name,
            company_id=company_id,
            actor_id=current_user_id,
            target_user_id=data.user_id,
        )
    except Exception:
        pass

    return member


def list_project_members_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    effective: bool = False,
) -> list[ProjectMember] | list[dict]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view this project's members.",
        )

    if effective:
        return get_effective_project_members(db, project_id)
    return list_project_members(db, project_id)


def get_effective_project_members_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> list[dict]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view this project's members.",
        )

    return get_effective_project_members(db, project_id)


def remove_project_member_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    _check_project_management_permission(membership)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    project_member = get_project_member(db, project_id, user_id)
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a direct member of this project.",
        )

    remove_project_member(db, project_id, user_id)


def _resolve_project_activity_details(
    db: Session,
    activities: list[ProjectActivity],
) -> list[ProjectActivity]:
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


def get_project_activity_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[ProjectActivity], int]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view this project's activity.",
        )

    activities, total = get_project_activities(
        db=db,
        project_id=project_id,
        page=page,
        limit=limit,
    )

    activities = _resolve_project_activity_details(db, activities)

    return activities, total

