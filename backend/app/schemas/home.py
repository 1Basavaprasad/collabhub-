import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.project import ProjectStatus
from app.schemas.notification import UserInvitationResponse
from app.schemas.task import TaskResponse


class HomeAttentionSummary(BaseModel):
    overdue_count: int = 0
    due_today_count: int = 0
    in_progress_count: int = 0
    unread_notifications_count: int = 0
    pending_invitations_count: int = 0


class HomeProjectProgress(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None
    icon: str | None = "folder-kanban"
    color: str | None = "indigo"
    status: ProjectStatus = ProjectStatus.ACTIVE
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    completion_percentage: float = 0.0
    member_count: int = 0
    updated_at: datetime


class HomeActivityItem(BaseModel):
    id: uuid.UUID
    entity_type: str  # "task", "project", "team", "mention", "invitation", "system"
    title: str
    description: str
    actor_name: str
    actor_avatar_url: str | None = None
    deep_link: str | None = None
    created_at: datetime


class HomeMyWork(BaseModel):
    overdue: list[TaskResponse] = []
    due_today: list[TaskResponse] = []
    in_progress: list[TaskResponse] = []
    upcoming: list[TaskResponse] = []
    recently_completed: list[TaskResponse] = []


class HomeUserPermissions(BaseModel):
    role: str
    can_create_project: bool = False
    can_create_task: bool = False
    can_invite_members: bool = False
    can_manage_company: bool = False


class HomeCommandCenterResponse(BaseModel):
    attention: HomeAttentionSummary
    my_work: HomeMyWork
    recent_projects: list[HomeProjectProgress] = []
    recent_activity: list[HomeActivityItem] = []
    pending_invitations: list[UserInvitationResponse] = []
    user_permissions: HomeUserPermissions
    workspace_name: str
    workspace_logo_url: str | None = None
