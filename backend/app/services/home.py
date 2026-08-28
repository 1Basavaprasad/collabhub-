import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.models.user import User
from app.repositories.company import get_company_by_id, get_company_membership
from app.repositories.home import (
    get_accessible_project_ids,
    get_home_accessible_projects_progress,
    get_home_my_work_tasks,
    get_home_recent_activity,
)
from app.repositories.notification import count_unread_notifications
from app.schemas.home import (
    HomeActivityItem,
    HomeAttentionSummary,
    HomeCommandCenterResponse,
    HomeMyWork,
    HomeProjectProgress,
    HomeUserPermissions,
)
from app.schemas.task import TaskResponse
from app.services.company_invitation import get_my_pending_invitations_service


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


def get_home_command_center_service(
    db: Session,
    company_id: uuid.UUID,
    current_user: User,
) -> HomeCommandCenterResponse:
    """Retrieve full aggregated Home Command Center state for the authenticated user in active workspace."""
    company, membership = _get_validated_membership(db, company_id, current_user.id)
    is_admin_or_owner = membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN)

    # 1. My Work tasks
    my_work_raw = get_home_my_work_tasks(db, company_id, current_user.id)
    my_work = HomeMyWork(
        overdue=[TaskResponse.model_validate(t) for t in my_work_raw["overdue"]],
        due_today=[TaskResponse.model_validate(t) for t in my_work_raw["due_today"]],
        in_progress=[TaskResponse.model_validate(t) for t in my_work_raw["in_progress"]],
        upcoming=[TaskResponse.model_validate(t) for t in my_work_raw["upcoming"]],
        recently_completed=[TaskResponse.model_validate(t) for t in my_work_raw["recently_completed"]],
    )

    # 2. Accessible projects with progress metrics
    accessible_ids = get_accessible_project_ids(db, company_id, current_user.id, is_admin_or_owner)
    recent_projects_raw = get_home_accessible_projects_progress(
        db, company_id, current_user.id, is_admin_or_owner, limit=6
    )
    recent_projects = [HomeProjectProgress(**p) for p in recent_projects_raw]

    # 3. Recent activity stream
    recent_act_raw = get_home_recent_activity(
        db, company_id, current_user.id, accessible_ids, limit=8
    )
    recent_activity = [HomeActivityItem(**a) for a in recent_act_raw]

    # 4. Pending Invitations for user's email
    pending_invs_raw = get_my_pending_invitations_service(db, current_user.email)

    # 5. Unread notification count
    unread_notifs_count = count_unread_notifications(db, current_user.id, company_id)

    # 6. Attention metrics summary
    attention = HomeAttentionSummary(
        overdue_count=len(my_work.overdue),
        due_today_count=len(my_work.due_today),
        in_progress_count=len(my_work.in_progress),
        unread_notifications_count=unread_notifs_count,
        pending_invitations_count=len(pending_invs_raw),
    )

    # 7. User permissions
    user_permissions = HomeUserPermissions(
        role=membership.role.value if hasattr(membership.role, "value") else str(membership.role),
        can_create_project=is_admin_or_owner,
        can_create_task=is_admin_or_owner or len(accessible_ids) > 0,
        can_invite_members=is_admin_or_owner,
        can_manage_company=membership.role == CompanyRole.OWNER,
    )

    return HomeCommandCenterResponse(
        attention=attention,
        my_work=my_work,
        recent_projects=recent_projects,
        recent_activity=recent_activity,
        pending_invitations=pending_invs_raw,
        user_permissions=user_permissions,
        workspace_name=company.name,
        workspace_logo_url=company.logo_url,
    )
