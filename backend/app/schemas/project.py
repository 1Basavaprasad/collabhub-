import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.project import ProjectStatus


class ProjectBase(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Name of the project",
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Description of the project scope and goals",
    )
    icon: str | None = Field(
        default="folder-kanban",
        max_length=50,
        description="Icon identifier for visual identity",
    )
    color: str | None = Field(
        default="indigo",
        max_length=50,
        description="Color theme for visual identity",
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) < 2:
            raise ValueError("Project name must be at least 2 characters long.")
        if len(trimmed) > 100:
            raise ValueError("Project name cannot exceed 100 characters.")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
    )
    icon: str | None = Field(
        default=None,
        max_length=50,
    )
    color: str | None = Field(
        default=None,
        max_length=50,
    )
    status: ProjectStatus | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        if len(trimmed) < 2:
            raise ValueError("Project name must be at least 2 characters long.")
        if len(trimmed) > 100:
            raise ValueError("Project name cannot exceed 100 characters.")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class ProjectUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


# Keep ProjectCreatorSummary for backwards-compatibility
class ProjectCreatorSummary(ProjectUserSummary):
    pass


class ProjectTeamSummary(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    icon: str | None = "users"
    color: str | None = "indigo"
    is_archived: bool = False

    model_config = ConfigDict(from_attributes=True)


class ProjectTeamAssign(BaseModel):
    team_id: uuid.UUID


class ProjectTeamResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    team_id: uuid.UUID
    created_at: datetime
    team: ProjectTeamSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberAssign(BaseModel):
    user_id: uuid.UUID


class ProjectMemberResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    user: ProjectUserSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectEffectiveMemberResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str
    source_type: str = "direct"  # "direct", "team", "both"
    team_names: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class ProjectResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    description: str | None = None
    icon: str | None = "folder-kanban"
    color: str | None = "indigo"
    status: ProjectStatus = ProjectStatus.ACTIVE
    created_by: uuid.UUID | None = None
    creator: ProjectCreatorSummary | None = None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectResponse):
    teams: list[ProjectTeamResponse] = []
    direct_members: list[ProjectMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProjectActivityResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    company_id: uuid.UUID
    actor_user_id: uuid.UUID | None = None
    task_id: uuid.UUID | None = None
    target_user_id: uuid.UUID | None = None
    action: str
    details: str | None = None
    event_metadata: str | None = None
    created_at: datetime
    actor: ProjectUserSummary | None = None
    target_user: ProjectUserSummary | None = None

    model_config = ConfigDict(from_attributes=True)
