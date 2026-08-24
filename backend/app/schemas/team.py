import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.team_member import TeamRole


class TeamBase(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Name of the team",
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Description of the team purpose",
    )
    icon: str | None = Field(
        default="users",
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
            raise ValueError("Team name must be at least 2 characters long.")
        if len(trimmed) > 100:
            raise ValueError("Team name cannot exceed 100 characters.")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
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
    is_archived: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        if len(trimmed) < 2:
            raise ValueError("Team name must be at least 2 characters long.")
        if len(trimmed) > 100:
            raise ValueError("Team name cannot exceed 100 characters.")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class TeamMemberUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class TeamMemberCreate(BaseModel):
    user_id: uuid.UUID
    role: TeamRole = Field(default=TeamRole.MEMBER)


class BatchTeamMembersCreate(BaseModel):
    user_ids: list[uuid.UUID] = Field(..., min_length=1)
    role: TeamRole = Field(default=TeamRole.MEMBER)


class TransferLeadershipRequest(BaseModel):
    new_lead_user_id: uuid.UUID


class TeamMemberUpdate(BaseModel):
    role: TeamRole


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID
    role: TeamRole
    joined_at: datetime
    created_at: datetime
    updated_at: datetime
    user: TeamMemberUserSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class TeamActivityResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    actor_user_id: uuid.UUID | None = None
    action: str
    details: str | None = None
    created_at: datetime
    actor: TeamMemberUserSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class TeamResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    description: str | None = None
    icon: str | None = "users"
    color: str | None = "indigo"
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    member_count: int | None = None
    leads: list[TeamMemberUserSummary] | None = None
    members_preview: list[TeamMemberUserSummary] | None = None

    model_config = ConfigDict(from_attributes=True)


class TeamDetailResponse(TeamResponse):
    members: list[TeamMemberResponse] = []
