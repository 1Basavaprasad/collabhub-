import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectActivityResponse,
    ProjectCreate,
    ProjectDetailResponse,
    ProjectEffectiveMemberResponse,
    ProjectMemberAssign,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectTeamAssign,
    ProjectTeamResponse,
    ProjectUpdate,
)
from app.services.project import (
    add_project_member_service,
    add_project_team_service,
    archive_project_service,
    create_project_service,
    delete_project_service,
    get_company_projects_service,
    get_effective_project_members_service,
    get_project_activity_service,
    get_project_service,
    list_project_members_service,
    list_project_teams_service,
    remove_project_member_service,
    remove_project_team_service,
    restore_project_service,
    update_project_service,
)

router = APIRouter(
    prefix="/companies/{company_id}/projects",
    tags=["Projects"],
)


@router.get(
    "",
    response_model=PaginatedResponse[ProjectResponse],
    status_code=status.HTTP_200_OK,
    summary="List projects in a workspace with pagination and filters",
)
def list_projects(
    company_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    status: str | None = Query(None, description="Status filter: all, active, archived"),
    search: str | None = Query(None, description="Search by project name or description"),
    sort_by: str | None = Query(None, description="Sort by: name, recently_created, recently_updated"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = get_company_projects_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        page=page,
        limit=limit,
        status_filter=status,
        search=search,
        sort_by=sort_by,
    )
    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project in a workspace",
)
def create_project(
    company_id: uuid.UUID,
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_project_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        data=data,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get project details and metadata",
)
def get_project_details(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_project_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update project name, description, icon, color, or status",
)
def update_project(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_project_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        data=data,
    )


@router.post(
    "/{project_id}/archive",
    status_code=status.HTTP_200_OK,
    summary="Archive a project",
)
def archive_project(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return archive_project_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


@router.post(
    "/{project_id}/restore",
    status_code=status.HTTP_200_OK,
    summary="Restore an archived project",
)
def restore_project(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return restore_project_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a project",
)
def delete_project(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    delete_project_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


# ============================================================================
# Project Teams Endpoints
# ============================================================================


@router.post(
    "/{project_id}/teams",
    response_model=ProjectTeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a team to a project",
)
def add_project_team(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectTeamAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_project_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        data=data,
    )


@router.get(
    "/{project_id}/teams",
    response_model=list[ProjectTeamResponse],
    status_code=status.HTTP_200_OK,
    summary="List teams assigned to a project",
)
def list_project_teams(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_project_teams_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


@router.delete(
    "/{project_id}/teams/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an assigned team from a project",
)
def remove_project_team(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    remove_project_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        team_id=team_id,
    )


# ============================================================================
# Project Direct Members & Effective Members Endpoints
# ============================================================================


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a direct member to a project",
)
def add_project_member(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: ProjectMemberAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_project_member_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        data=data,
    )


@router.get(
    "/{project_id}/members/effective",
    response_model=list[ProjectEffectiveMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="List effective project members (direct + inherited from assigned teams)",
)
def get_effective_project_members(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_effective_project_members_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


@router.get(
    "/{project_id}/effective-members",
    response_model=list[ProjectEffectiveMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="List effective project members alias (direct + inherited from assigned teams)",
)
def get_effective_project_members_alias(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_effective_project_members_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
    )


@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponse] | list[ProjectEffectiveMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="List direct or effective project members",
)
def list_project_members(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    effective: bool = Query(False, description="Whether to include effective members from assigned teams"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_project_members_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        effective=effective,
    )


@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a direct member from a project",
)
def remove_project_member(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    remove_project_member_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        user_id=user_id,
    )


@router.get(
    "/{project_id}/activity",
    response_model=PaginatedResponse[ProjectActivityResponse],
    status_code=status.HTTP_200_OK,
    summary="Get project activity audit timeline with pagination",
)
def get_project_activity(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = get_project_activity_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        page=page,
        limit=limit,
    )
    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )

