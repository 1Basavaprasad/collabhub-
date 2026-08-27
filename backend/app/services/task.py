import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.models.project import Project
from app.models.task import Task, TaskPriority, TaskStatus
from app.repositories.company import get_company_by_id, get_company_membership
from app.repositories.project import (
    get_effective_project_members,
    get_project_simple,
    is_user_effective_project_member,
)
from app.repositories.task import (
    create_task,
    delete_task,
    get_my_tasks_summary,
    get_task,
    list_my_tasks,
    list_tasks,
    update_task,
    update_task_status,
)
from app.schemas.task import TaskCreate, TaskStatusUpdate, TaskUpdate


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


def _get_validated_project(
    db: Session,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
) -> Project:
    project = get_project_simple(db, project_id)
    if not project or project.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found in this company workspace.",
        )
    return project


def _get_effective_member_user_ids(
    db: Session,
    project_id: uuid.UUID,
) -> set[uuid.UUID]:
    members = get_effective_project_members(db, project_id)
    return {m["id"] for m in members if "id" in m}


def _can_manage_project(
    membership: CompanyMember,
    project: Project,
    user_id: uuid.UUID,
) -> bool:
    if membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN):
        return True
    if project.created_by == user_id:
        return True
    return False


def _can_access_project(
    db: Session,
    membership: CompanyMember,
    project: Project,
    user_id: uuid.UUID,
) -> bool:
    if _can_manage_project(membership, project, user_id):
        return True
    return is_user_effective_project_member(db, project.id, user_id)


def create_task_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    data: TaskCreate,
) -> Task:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an assigned member of this project to create tasks.",
        )

    # Validate assignee if specified
    if data.assignee_id is not None:
        effective_ids = _get_effective_member_user_ids(db, project_id)
        if data.assignee_id not in effective_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be an assigned member of this project (direct or via team).",
            )

    return create_task(
        db=db,
        project_id=project.id,
        company_id=company_id,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        assignee_id=data.assignee_id,
        created_by_user_id=current_user_id,
        due_date=data.due_date,
        position=data.position,
    )


def get_task_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
) -> Task:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project's tasks.",
        )

    task = get_task(db, task_id)
    if not task or task.project_id != project_id or task.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this project.",
        )

    return task


def list_tasks_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    status_filter: TaskStatus | None = None,
    priority_filter: TaskPriority | None = None,
    assignee_id: uuid.UUID | None = None,
    search: str | None = None,
) -> list[Task]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project's tasks.",
        )

    return list_tasks(
        db=db,
        project_id=project.id,
        status=status_filter,
        priority=priority_filter,
        assignee_id=assignee_id,
        search=search,
    )


def list_my_tasks_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    status_filter: TaskStatus | None = None,
    priority_filter: TaskPriority | None = None,
    search: str | None = None,
) -> list[Task]:
    _get_validated_membership(db, company_id, current_user_id)
    return list_my_tasks(
        db=db,
        company_id=company_id,
        user_id=current_user_id,
        status=status_filter,
        priority=priority_filter,
        search=search,
    )


def get_my_tasks_summary_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
) -> dict:
    _get_validated_membership(db, company_id, current_user_id)
    return get_my_tasks_summary(
        db=db,
        company_id=company_id,
        user_id=current_user_id,
    )


def complete_task_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
) -> Task:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    task = get_task(db, task_id)
    if not task or task.project_id != project_id or task.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this project.",
        )

    is_manager = _can_manage_project(membership, project, current_user_id)
    is_assignee = task.assignee_id == current_user_id

    # Assignee or project manager can mark task complete
    if not is_manager and not is_assignee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned member or a project manager can mark this task as completed.",
        )

    return update_task_status(
        db=db,
        task=task,
        status=TaskStatus.DONE,
        current_user_id=current_user_id,
    )


def update_task_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskUpdate,
) -> Task:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to manage this project's tasks.",
        )

    task = get_task(db, task_id)
    if not task or task.project_id != project_id or task.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this project.",
        )

    is_manager = _can_manage_project(membership, project, current_user_id)
    is_effective = _can_access_project(db, membership, project, current_user_id)
    if not is_manager and not is_effective and task.created_by != current_user_id and task.assignee_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this task.",
        )

    # Validate new assignee if provided
    fields_set = data.model_fields_set
    if "assignee_id" in fields_set and data.assignee_id is not None:
        effective_ids = _get_effective_member_user_ids(db, project_id)
        if data.assignee_id not in effective_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be an assigned member of this project (direct or via team).",
            )

    return update_task(
        db=db,
        task=task,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        assignee_id=data.assignee_id,
        due_date=data.due_date,
        position=data.position,
        fields_to_update=fields_set,
        current_user_id=current_user_id,
    )


def update_task_status_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    data: TaskStatusUpdate,
) -> Task:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to move this project's tasks.",
        )

    task = get_task(db, task_id)
    if not task or task.project_id != project_id or task.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this project.",
        )

    return update_task_status(
        db=db,
        task=task,
        status=data.status,
        position=data.position,
        current_user_id=current_user_id,
    )


def delete_task_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    project = _get_validated_project(db, company_id, project_id)

    if not _can_access_project(db, membership, project, current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project's tasks.",
        )

    task = get_task(db, task_id)
    if not task or task.project_id != project_id or task.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this project.",
        )

    # Only project managers or task creator can delete task
    if not _can_manage_project(membership, project, current_user_id) and task.created_by != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers or the task creator can delete this task.",
        )

    delete_task(db, task, current_user_id=current_user_id)
