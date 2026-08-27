import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.repositories.project import log_project_activity


def _get_user_display_name(db: Session, user_id: uuid.UUID | None) -> str:
    if not user_id:
        return "member"
    u = db.query(User).filter(User.id == user_id).first()
    if u:
        return u.full_name or u.username or "member"
    return f"user {user_id}"


def _format_status_label(st: TaskStatus | str) -> str:
    val = st.value if isinstance(st, TaskStatus) else str(st)
    mapping = {
        "TODO": "To Do",
        "IN_PROGRESS": "In Progress",
        "REVIEW": "Review",
        "DONE": "Done",
    }
    return mapping.get(val, val.replace("_", " ").title())


def get_next_task_position(
    db: Session,
    project_id: uuid.UUID,
    status: TaskStatus,
) -> int:
    """Get the next integer position for a new or moved task in a given status column."""
    stmt = (
        select(func.coalesce(func.max(Task.position), -1))
        .where(Task.project_id == project_id)
        .where(Task.status == status)
    )
    max_pos = db.execute(stmt).scalar_one()
    return max_pos + 1


def create_task(
    db: Session,
    project_id: uuid.UUID,
    company_id: uuid.UUID,
    title: str,
    description: str | None = None,
    status: TaskStatus = TaskStatus.TODO,
    priority: TaskPriority = TaskPriority.MEDIUM,
    assignee_id: uuid.UUID | None = None,
    created_by_user_id: uuid.UUID | None = None,
    due_date: datetime | None = None,
    position: int | None = None,
) -> Task:
    if position is None or position == 0:
        position = get_next_task_position(db, project_id, status)

    completed_by_id = None
    completed_at = None
    if status == TaskStatus.DONE:
        completed_by_id = created_by_user_id
        completed_at = datetime.now(timezone.utc)

    task = Task(
        project_id=project_id,
        company_id=company_id,
        title=title,
        description=description,
        status=status,
        priority=priority,
        assignee_id=assignee_id,
        created_by=created_by_user_id,
        completed_by_id=completed_by_id,
        completed_at=completed_at,
        due_date=due_date,
        position=position,
    )
    db.add(task)
    db.flush()

    # Log TASK_CREATED activity
    log_project_activity(
        db=db,
        project_id=project_id,
        company_id=company_id,
        action="TASK_CREATED",
        actor_user_id=created_by_user_id,
        task_id=task.id,
        details=f'created task "{title}"',
        commit=False,
    )

    # If assigned initially, also log TASK_ASSIGNED
    if assignee_id is not None:
        assignee_name = _get_user_display_name(db, assignee_id)
        log_project_activity(
            db=db,
            project_id=project_id,
            company_id=company_id,
            action="TASK_ASSIGNED",
            actor_user_id=created_by_user_id,
            task_id=task.id,
            target_user_id=assignee_id,
            details=f'assigned "{title}" to {assignee_name}',
            commit=False,
        )

    db.commit()
    db.refresh(task)

    # Return with loaded relationships
    return get_task(db, task.id) or task


def get_task(
    db: Session,
    task_id: uuid.UUID,
) -> Task | None:
    """Retrieve a single task by ID with preloaded relationships."""
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.completed_by),
            selectinload(Task.project),
        )
        .where(Task.id == task_id)
    )
    return db.execute(stmt).scalar_one_or_none()


def list_project_tasks(
    db: Session,
    project_id: uuid.UUID,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    assignee_id: uuid.UUID | None = None,
    search: str | None = None,
) -> list[Task]:
    """List tasks in a project with optional filters and preloaded relations."""
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.completed_by),
            selectinload(Task.project),
        )
        .where(Task.project_id == project_id)
    )

    if status:
        stmt = stmt.where(Task.status == status)

    if priority:
        stmt = stmt.where(Task.priority == priority)

    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Task.title.ilike(term),
                Task.description.ilike(term),
            )
        )

    # Order by position within status, then created_at
    stmt = stmt.order_by(
        Task.status,
        Task.position.asc(),
        Task.created_at.asc(),
    )
    return list(db.execute(stmt).scalars().all())


# Alias for backward compatibility
list_tasks = list_project_tasks


def list_my_tasks(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    search: str | None = None,
) -> list[Task]:
    """List all tasks assigned to the user across all projects in the company."""
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.completed_by),
            selectinload(Task.project),
        )
        .where(Task.company_id == company_id)
        .where(Task.assignee_id == user_id)
    )

    if status:
        stmt = stmt.where(Task.status == status)

    if priority:
        stmt = stmt.where(Task.priority == priority)

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Task.title.ilike(term),
                Task.description.ilike(term),
            )
        )

    stmt = stmt.order_by(
        Task.status,
        Task.due_date.asc().nullslast(),
        Task.created_at.desc(),
    )
    return list(db.execute(stmt).scalars().all())


def get_my_tasks_summary(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict:
    """Return summary statistics for tasks assigned to the user."""
    all_assigned_stmt = (
        select(Task)
        .where(Task.company_id == company_id)
        .where(Task.assignee_id == user_id)
    )
    tasks = list(db.execute(all_assigned_stmt).scalars().all())

    now = datetime.now(timezone.utc)

    assigned_to_me = len(tasks)
    completed = 0
    due_today = 0
    overdue = 0

    for t in tasks:
        if t.status == TaskStatus.DONE:
            completed += 1
        else:
            if t.due_date:
                due_dt = t.due_date
                if due_dt.tzinfo is None:
                    due_dt = due_dt.replace(tzinfo=timezone.utc)
                
                # Check if due today
                if due_dt.date() == now.date():
                    due_today += 1
                elif due_dt < now:
                    overdue += 1

    return {
        "assigned_to_me": assigned_to_me,
        "due_today": due_today,
        "overdue": overdue,
        "completed": completed,
    }


def update_task(
    db: Session,
    task: Task,
    title: str | None = None,
    description: str | None = None,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    assignee_id: uuid.UUID | None = None,
    due_date: datetime | None = None,
    position: int | None = None,
    current_user_id: uuid.UUID | None = None,
    fields_to_update: set[str] | None = None,
) -> Task:
    """Update task fields, manage completion timestamps, and log activity."""
    old_status = task.status
    old_assignee_id = task.assignee_id
    old_priority = task.priority
    old_due_date = task.due_date
    old_title = task.title
    old_description = task.description

    if title is not None:
        task.title = title
    if description is not None:
        task.description = description
    if status is not None:
        task.status = status
    if priority is not None:
        task.priority = priority

    if fields_to_update is not None:
        if "assignee_id" in fields_to_update:
            task.assignee_id = assignee_id
        if "due_date" in fields_to_update:
            task.due_date = due_date
    else:
        if assignee_id is not None:
            task.assignee_id = assignee_id
        if due_date is not None:
            task.due_date = due_date

    if position is not None:
        task.position = position

    # Handle completion status transitions
    if task.status == TaskStatus.DONE and old_status != TaskStatus.DONE:
        task.completed_by_id = current_user_id or task.assignee_id
        task.completed_at = datetime.now(timezone.utc)
    elif task.status != TaskStatus.DONE and old_status == TaskStatus.DONE:
        task.completed_by_id = None
        task.completed_at = None

    activities_logged = 0

    # 1. Assignee change
    if (fields_to_update is None or "assignee_id" in fields_to_update) and task.assignee_id != old_assignee_id:
        if task.assignee_id is not None and old_assignee_id is None:
            assignee_name = _get_user_display_name(db, task.assignee_id)
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_ASSIGNED",
                actor_user_id=current_user_id,
                task_id=task.id,
                target_user_id=task.assignee_id,
                details=f'assigned "{task.title}" to {assignee_name}',
                commit=False,
            )
            activities_logged += 1
        elif task.assignee_id is None and old_assignee_id is not None:
            old_name = _get_user_display_name(db, old_assignee_id)
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_UNASSIGNED",
                actor_user_id=current_user_id,
                task_id=task.id,
                target_user_id=old_assignee_id,
                details=f'removed {old_name} from "{task.title}"',
                commit=False,
            )
            activities_logged += 1
        elif task.assignee_id is not None and old_assignee_id is not None and task.assignee_id != old_assignee_id:
            assignee_name = _get_user_display_name(db, task.assignee_id)
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_ASSIGNED",
                actor_user_id=current_user_id,
                task_id=task.id,
                target_user_id=task.assignee_id,
                details=f'reassigned "{task.title}" to {assignee_name}',
                commit=False,
            )
            activities_logged += 1

    # 2. Status change
    if (fields_to_update is None or "status" in fields_to_update) and task.status != old_status:
        if task.status == TaskStatus.DONE:
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_COMPLETED",
                actor_user_id=current_user_id,
                task_id=task.id,
                target_user_id=task.assignee_id,
                details=f'completed "{task.title}"',
                commit=False,
            )
            activities_logged += 1
        else:
            new_label = _format_status_label(task.status)
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_STATUS_CHANGED",
                actor_user_id=current_user_id,
                task_id=task.id,
                details=f'moved "{task.title}" to {new_label}',
                commit=False,
            )
            activities_logged += 1

    # 3. Priority change
    if (fields_to_update is None or "priority" in fields_to_update) and task.priority != old_priority:
        old_p_str = old_priority.value.title() if hasattr(old_priority, 'value') else str(old_priority).title()
        new_p_str = task.priority.value.title() if hasattr(task.priority, 'value') else str(task.priority).title()
        log_project_activity(
            db=db,
            project_id=task.project_id,
            company_id=task.company_id,
            action="TASK_PRIORITY_CHANGED",
            actor_user_id=current_user_id,
            task_id=task.id,
            details=f'changed priority of "{task.title}" from {old_p_str} to {new_p_str}',
            commit=False,
        )
        activities_logged += 1

    # 4. Due date change
    if (fields_to_update is None or "due_date" in fields_to_update) and task.due_date != old_due_date:
        if task.due_date is None and old_due_date is not None:
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_DUE_DATE_CHANGED",
                actor_user_id=current_user_id,
                task_id=task.id,
                details=f'removed the due date from "{task.title}"',
                commit=False,
            )
            activities_logged += 1
        elif task.due_date is not None:
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_DUE_DATE_CHANGED",
                actor_user_id=current_user_id,
                task_id=task.id,
                details=f'changed the due date of "{task.title}"',
                commit=False,
            )
            activities_logged += 1

    # 5. Generic update if title/description changed and no other event was logged
    if activities_logged == 0 and (task.title != old_title or task.description != old_description):
        log_project_activity(
            db=db,
            project_id=task.project_id,
            company_id=task.company_id,
            action="TASK_UPDATED",
            actor_user_id=current_user_id,
            task_id=task.id,
            details=f'updated "{task.title}"',
            commit=False,
        )

    db.commit()
    db.refresh(task)
    return get_task(db, task.id) or task


def update_task_status(
    db: Session,
    task: Task,
    status: TaskStatus,
    position: int | None = None,
    current_user_id: uuid.UUID | None = None,
) -> Task:
    old_status = task.status
    task.status = status

    if position is not None:
        task.position = position
    else:
        task.position = get_next_task_position(db, task.project_id, status)

    if task.status == TaskStatus.DONE and old_status != TaskStatus.DONE:
        task.completed_by_id = current_user_id or task.assignee_id
        task.completed_at = datetime.now(timezone.utc)
    elif task.status != TaskStatus.DONE and old_status == TaskStatus.DONE:
        task.completed_by_id = None
        task.completed_at = None

    if task.status != old_status:
        if task.status == TaskStatus.DONE:
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_COMPLETED",
                actor_user_id=current_user_id,
                task_id=task.id,
                target_user_id=task.assignee_id,
                details=f'completed "{task.title}"',
                commit=False,
            )
        else:
            new_label = _format_status_label(task.status)
            log_project_activity(
                db=db,
                project_id=task.project_id,
                company_id=task.company_id,
                action="TASK_STATUS_CHANGED",
                actor_user_id=current_user_id,
                task_id=task.id,
                details=f'moved "{task.title}" to {new_label}',
                commit=False,
            )

    db.commit()
    db.refresh(task)
    return get_task(db, task.id) or task


def delete_task(
    db: Session,
    task: Task,
    current_user_id: uuid.UUID | None = None,
) -> bool:
    log_project_activity(
        db=db,
        project_id=task.project_id,
        company_id=task.company_id,
        action="TASK_DELETED",
        actor_user_id=current_user_id,
        task_id=None,
        details=f'deleted task "{task.title}"',
        commit=False,
    )
    db.delete(task)
    db.commit()
    return True

