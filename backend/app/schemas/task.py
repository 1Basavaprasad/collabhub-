import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.task import TaskPriority, TaskStatus


class TaskUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class TaskProjectSummary(BaseModel):
    id: uuid.UUID
    name: str
    icon: str | None = "folder"
    color: str | None = "indigo"

    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Task title",
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
        description="Detailed task description",
    )
    status: TaskStatus = Field(
        default=TaskStatus.TODO,
        description="Current Kanban column/status",
    )
    priority: TaskPriority = Field(
        default=TaskPriority.MEDIUM,
        description="Task priority level",
    )
    assignee_id: uuid.UUID | None = Field(
        default=None,
        description="User assigned to the task (must belong to effective project members)",
    )
    due_date: datetime | None = Field(
        default=None,
        description="Target completion date/time",
    )
    position: int = Field(
        default=0,
        ge=0,
        description="Display order within status column",
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Task title cannot be empty.")
        if len(trimmed) > 200:
            raise ValueError("Task title cannot exceed 200 characters.")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
    )
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: uuid.UUID | None = None
    due_date: datetime | None = None
    position: int | None = Field(default=None, ge=0)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Task title cannot be empty.")
        if len(trimmed) > 200:
            raise ValueError("Task title cannot exceed 200 characters.")
        return trimmed

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is None:
            return None
        trimmed = v.strip()
        return trimmed if trimmed else None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus = Field(..., description="Target task status")
    position: int | None = Field(default=None, ge=0, description="Optional target position in column")


class TaskResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    company_id: uuid.UUID
    title: str
    description: str | None = None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: uuid.UUID | None = None
    created_by: uuid.UUID | None = None
    completed_by_id: uuid.UUID | None = None
    completed_at: datetime | None = None
    due_date: datetime | None = None
    position: int = 0
    created_at: datetime
    updated_at: datetime
    assignee: TaskUserSummary | None = None
    creator: TaskUserSummary | None = None
    completed_by: TaskUserSummary | None = None
    project: TaskProjectSummary | None = None

    model_config = ConfigDict(from_attributes=True)


class TaskSummaryStats(BaseModel):
    assigned_to_me: int
    due_today: int
    overdue: int
    completed: int
