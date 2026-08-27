import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.task import TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
    TaskSummaryStats,
    TaskUpdate,
)
from app.services.task import (
    complete_task_service,
    create_task_service,
    delete_task_service,
    get_my_tasks_summary_service,
    get_task_service,
    list_my_tasks_service,
    list_tasks_service,
    update_task_service,
    update_task_status_service,
)

router = APIRouter(
    prefix="/companies/{company_id}/projects/{project_id}/tasks",
    tags=["Project Tasks"],
)

my_tasks_router = APIRouter(
    prefix="/companies/{company_id}/my-tasks",
    tags=["My Tasks"],
)


# ============================================================
# PROJECT TASKS ENDPOINTS
# ============================================================

@router.get(
    "",
    response_model=list[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tasks for a project with optional filters",
)
def list_tasks(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    status: TaskStatus | None = Query(None, description="Filter by status (TODO, IN_PROGRESS, REVIEW, DONE)"),
    priority: TaskPriority | None = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, URGENT)"),
    assignee_id: uuid.UUID | None = Query(None, description="Filter by assigned user ID"),
    search: str | None = Query(None, description="Search keyword in task title or description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_tasks_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        status_filter=status,
        priority_filter=priority,
        assignee_id=assignee_id,
        search=search,
    )


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task in a project",
)
def create_task(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_task_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        data=data,
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Get task details",
)
def get_task_details(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_task_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        task_id=task_id,
    )


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Update task title, description, priority, assignee, due date, or position",
)
def update_task(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_task_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        task_id=task_id,
        data=data,
    )


@router.patch(
    "/{task_id}/status",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Update task status (Kanban column transition) and position",
)
def update_task_status(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_task_status_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        task_id=task_id,
        data=data,
    )


@router.patch(
    "/{task_id}/complete",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Explicitly mark a task as completed",
)
@router.post(
    "/{task_id}/complete",
    response_model=TaskResponse,
    status_code=status.HTTP_200_OK,
    summary="Explicitly mark a task as completed",
)
def complete_task(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return complete_task_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        task_id=task_id,
    )


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
)
def delete_task(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_task_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        project_id=project_id,
        task_id=task_id,
    )


# ============================================================
# MY TASKS ENDPOINTS
# ============================================================

@my_tasks_router.get(
    "",
    response_model=list[TaskResponse],
    status_code=status.HTTP_200_OK,
    summary="List all tasks assigned to the current user across all projects in the company",
)
def list_my_tasks(
    company_id: uuid.UUID,
    status: TaskStatus | None = Query(None, description="Filter by status (TODO, IN_PROGRESS, REVIEW, DONE)"),
    priority: TaskPriority | None = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, URGENT)"),
    search: str | None = Query(None, description="Search keyword in task title or description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_my_tasks_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        status_filter=status,
        priority_filter=priority,
        search=search,
    )


@my_tasks_router.get(
    "/summary",
    response_model=TaskSummaryStats,
    status_code=status.HTTP_200_OK,
    summary="Get summary KPI counts for current user's assigned tasks (assigned, due today, overdue, completed)",
)
def get_my_tasks_summary(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_tasks_summary_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
    )
