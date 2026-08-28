import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.company_member import CompanyRole
from app.models.notification import NotificationEntityType


class NotificationActorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    username: str
    email: str


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    company_id: uuid.UUID
    actor_id: uuid.UUID | None = None
    actor: NotificationActorSummary | None = None
    entity_type: NotificationEntityType
    entity_id: uuid.UUID | None = None
    action: str
    title: str
    message: str
    deep_link: str | None = None
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int = Field(ge=0, description="Total unread notifications count for the user in this workspace")


class NotificationPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_assignments_in_app: bool
    task_updates_in_app: bool
    mentions_in_app: bool
    team_activity_in_app: bool
    project_activity_in_app: bool
    invitations_in_app: bool
    chat_messages_in_app: bool

    task_assignments_email: bool
    task_updates_email: bool
    mentions_email: bool
    team_activity_email: bool
    project_activity_email: bool
    invitations_email: bool
    chat_messages_email: bool


class NotificationPreferenceUpdate(BaseModel):
    task_assignments_in_app: bool | None = None
    task_updates_in_app: bool | None = None
    mentions_in_app: bool | None = None
    team_activity_in_app: bool | None = None
    project_activity_in_app: bool | None = None
    invitations_in_app: bool | None = None
    chat_messages_in_app: bool | None = None

    task_assignments_email: bool | None = None
    task_updates_email: bool | None = None
    mentions_email: bool | None = None
    team_activity_email: bool | None = None
    project_activity_email: bool | None = None
    invitations_email: bool | None = None
    chat_messages_email: bool | None = None


class UserInvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    company_logo_url: str | None = None
    inviter_id: uuid.UUID
    inviter_name: str
    inviter_email: str
    role: CompanyRole
    designation: str | None = None
    department: str | None = None
    status: str
    expires_at: datetime
    created_at: datetime


class InvitationActionResponse(BaseModel):
    message: str
    invitation_id: uuid.UUID
    status: str
    company_id: uuid.UUID | None = None
    company_name: str | None = None
