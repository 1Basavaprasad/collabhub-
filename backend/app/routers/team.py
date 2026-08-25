import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.team_member import TeamRole
from app.models.user import User
from app.schemas.pagination import PaginatedResponse
from app.schemas.team import (
    BatchTeamMembersCreate,
    TeamActivityResponse,
    TeamCreate,
    TeamDetailResponse,
    TeamMemberCreate,
    TeamMemberResponse,
    TeamMemberUpdate,
    TeamResponse,
    TeamUpdate,
    TransferLeadershipRequest,
)
from app.services.team import (
    add_team_member_service,
    archive_team_service,
    batch_add_team_members_service,
    create_team_service,
    delete_team_service,
    get_company_teams_service,
    get_team_activity_service,
    get_team_members_service,
    get_team_service,
    remove_team_member_service,
    restore_team_service,
    transfer_leadership_service,
    update_team_member_service,
    update_team_service,
)

router = APIRouter(
    prefix="/companies/{company_id}/teams",
    tags=["Teams"],
)


@router.get(
    "",
    response_model=PaginatedResponse[TeamResponse],
    status_code=status.HTTP_200_OK,
    summary="List teams in a workspace with pagination and filters",
)
def list_teams(
    company_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    status: str | None = Query(None, description="Status filter: all, active, archived"),
    my_teams: bool = Query(False, description="Filter to teams user belongs to"),
    search: str | None = Query(None, description="Search by team name or description"),
    sort_by: str | None = Query(None, description="Sort by: name, recently_created, most_members"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = get_company_teams_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        page=page,
        limit=limit,
        status_filter=status,
        my_teams=my_teams,
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
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new team in a workspace",
)
def create_team(
    company_id: uuid.UUID,
    data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    team = create_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        data=data,
    )
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
        "member_count": 1,
        "leads": [current_user],
        "members_preview": [current_user],
    }


@router.get(
    "/{team_id}",
    response_model=TeamDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get team details and members",
)
def get_team_details(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return get_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
    )


@router.patch(
    "/{team_id}",
    response_model=TeamResponse,
    status_code=status.HTTP_200_OK,
    summary="Update team name, description, icon, or color",
)
def update_team(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return update_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        data=data,
    )


@router.post(
    "/{team_id}/archive",
    status_code=status.HTTP_200_OK,
    summary="Archive a team",
)
def archive_team(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return archive_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
    )


@router.post(
    "/{team_id}/restore",
    status_code=status.HTTP_200_OK,
    summary="Restore an archived team",
)
def restore_team(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return restore_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
    )


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete a team",
)
def delete_team(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    delete_team_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
    )


# ============================================================
# TEAM MEMBERS ENDPOINTS
# ============================================================


@router.get(
    "/{team_id}/members",
    response_model=PaginatedResponse[TeamMemberResponse],
    status_code=status.HTTP_200_OK,
    summary="List all members in a team with pagination",
)
def list_team_members(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    role: TeamRole | None = Query(None, description="Filter by team role"),
    search: str | None = Query(None, description="Search member name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = get_team_members_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        page=page,
        limit=limit,
        role=role,
        search=search,
    )
    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.post(
    "/{team_id}/members",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a single company member to the team",
)
def add_team_member(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_team_member_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        data=data,
    )


@router.post(
    "/{team_id}/members/batch",
    response_model=list[TeamMemberResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch add multiple company members to the team",
)
def batch_add_team_members(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: BatchTeamMembersCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return batch_add_team_members_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        data=data,
    )


@router.post(
    "/{team_id}/transfer-leadership",
    status_code=status.HTTP_200_OK,
    summary="Transfer team leadership to another member",
)
def transfer_team_leadership(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: TransferLeadershipRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return transfer_leadership_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        data=data,
    )


@router.patch(
    "/{team_id}/members/{user_id}",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a team member's role (LEAD or MEMBER)",
)
def update_team_member(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    data: TeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_team_member_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        target_user_id=user_id,
        data=data,
    )


@router.delete(
    "/{team_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a member from the team",
)
def remove_team_member(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    remove_team_member_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        target_user_id=user_id,
    )


# ============================================================
# TEAM ACTIVITY ENDPOINTS
# ============================================================


@router.get(
    "/{team_id}/activity",
    response_model=PaginatedResponse[TeamActivityResponse],
    status_code=status.HTTP_200_OK,
    summary="Get real activity audit log for a team with pagination",
)
def get_team_activity(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = get_team_activity_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        page=page,
        limit=limit,
    )
    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )
