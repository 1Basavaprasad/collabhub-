import uuid
from datetime import datetime, timezone

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.notification import Notification
from app.models.project import Project, ProjectStatus
from app.models.project_activity import ProjectActivity
from app.models.project_member import ProjectMember
from app.models.project_team import ProjectTeam
from app.models.task import Task, TaskStatus
from app.models.team_member import TeamMember


def get_home_my_work_tasks(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict[str, list[Task]]:
    """Retrieve and partition all tasks assigned to the user in the company."""
    # 1. Fetch active (non-DONE) tasks assigned to user
    active_stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.completed_by),
            selectinload(Task.project),
        )
        .where(
            Task.company_id == company_id,
            Task.assignee_id == user_id,
            Task.status != TaskStatus.DONE,
        )
        .order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
    )
    active_tasks = list(db.execute(active_stmt).scalars().all())

    # 2. Fetch last 5 completed tasks
    completed_stmt = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.creator),
            selectinload(Task.completed_by),
            selectinload(Task.project),
        )
        .where(
            Task.company_id == company_id,
            Task.assignee_id == user_id,
            Task.status == TaskStatus.DONE,
        )
        .order_by(Task.completed_at.desc().nullslast(), Task.updated_at.desc())
        .limit(5)
    )
    completed_tasks = list(db.execute(completed_stmt).scalars().all())

    now = datetime.now(timezone.utc)
    today_date = now.date()

    overdue: list[Task] = []
    due_today: list[Task] = []
    in_progress: list[Task] = []
    upcoming: list[Task] = []

    for task in active_tasks:
        if task.due_date:
            due_dt = task.due_date
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            due_date_val = due_dt.date()

            if due_date_val < today_date:
                overdue.append(task)
                continue
            elif due_date_val == today_date:
                due_today.append(task)
                continue

        # If not overdue and not due today
        if task.status == TaskStatus.IN_PROGRESS:
            in_progress.append(task)
        else:
            upcoming.append(task)

    return {
        "overdue": overdue,
        "due_today": due_today,
        "in_progress": in_progress,
        "upcoming": upcoming,
        "recently_completed": completed_tasks,
    }


def get_accessible_project_ids(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    is_admin_or_owner: bool,
) -> set[uuid.UUID]:
    """Retrieve IDs of projects the user is authorized to access."""
    if is_admin_or_owner:
        # Company owners and admins have access to all projects in workspace
        stmt = select(Project.id).where(
            Project.company_id == company_id,
            Project.status != ProjectStatus.ARCHIVED,
        )
        return set(db.execute(stmt).scalars().all())

    # Direct membership
    direct_stmt = (
        select(ProjectMember.project_id)
        .join(Project, Project.id == ProjectMember.project_id)
        .where(
            Project.company_id == company_id,
            Project.status != ProjectStatus.ARCHIVED,
            ProjectMember.user_id == user_id,
        )
    )
    direct_ids = set(db.execute(direct_stmt).scalars().all())

    # Team membership
    team_stmt = (
        select(ProjectTeam.project_id)
        .join(Project, Project.id == ProjectTeam.project_id)
        .join(TeamMember, TeamMember.team_id == ProjectTeam.team_id)
        .where(
            Project.company_id == company_id,
            Project.status != ProjectStatus.ARCHIVED,
            TeamMember.user_id == user_id,
        )
    )
    team_ids = set(db.execute(team_stmt).scalars().all())

    return direct_ids | team_ids


def get_home_accessible_projects_progress(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    is_admin_or_owner: bool,
    limit: int = 6,
) -> list[dict]:
    """Retrieve accessible projects with calculated task progress metrics."""
    accessible_ids = get_accessible_project_ids(db, company_id, user_id, is_admin_or_owner)
    if not accessible_ids:
        return []

    # Query projects
    proj_stmt = (
        select(Project)
        .where(
            Project.id.in_(accessible_ids),
            Project.status != ProjectStatus.ARCHIVED,
        )
        .order_by(Project.updated_at.desc())
        .limit(limit)
    )
    projects = list(db.execute(proj_stmt).scalars().all())
    if not projects:
        return []

    p_ids = [p.id for p in projects]

    # Aggregate tasks by project and status in a single query
    task_stats_stmt = (
        select(
            Task.project_id,
            func.count(Task.id).label("total_count"),
            func.count(Task.id).filter(Task.status == TaskStatus.DONE).label("done_count"),
            func.count(Task.id).filter(Task.status == TaskStatus.IN_PROGRESS).label("in_progress_count"),
        )
        .where(Task.project_id.in_(p_ids))
        .group_by(Task.project_id)
    )
    task_stats_map = {
        row.project_id: {
            "total": row.total_count,
            "done": row.done_count,
            "in_progress": row.in_progress_count,
        }
        for row in db.execute(task_stats_stmt).all()
    }

    # Aggregate effective member count by project
    direct_count_stmt = (
        select(ProjectMember.project_id, func.count(ProjectMember.user_id).label("cnt"))
        .where(ProjectMember.project_id.in_(p_ids))
        .group_by(ProjectMember.project_id)
    )
    member_count_map = {row.project_id: row.cnt for row in db.execute(direct_count_stmt).all()}

    results = []
    for p in projects:
        stats = task_stats_map.get(p.id, {"total": 0, "done": 0, "in_progress": 0})
        total = stats["total"]
        done = stats["done"]
        pct = round((done / total) * 100, 1) if total > 0 else 0.0

        results.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "icon": p.icon or "folder-kanban",
            "color": p.color or "indigo",
            "status": p.status,
            "total_tasks": total,
            "completed_tasks": done,
            "in_progress_tasks": stats["in_progress"],
            "completion_percentage": pct,
            "member_count": member_count_map.get(p.id, 0),
            "updated_at": p.updated_at,
        })

    return results


def get_home_recent_activity(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    accessible_project_ids: set[uuid.UUID],
    limit: int = 8,
) -> list[dict]:
    """Retrieve human-readable activity items combining project activities and user notifications."""
    activities: list[dict] = []

    # 1. Project activities from accessible projects
    if accessible_project_ids:
        act_stmt = (
            select(ProjectActivity)
            .options(
                selectinload(ProjectActivity.actor),
                selectinload(ProjectActivity.target_user),
                selectinload(ProjectActivity.task),
            )
            .where(
                ProjectActivity.company_id == company_id,
                ProjectActivity.project_id.in_(accessible_project_ids),
            )
            .order_by(ProjectActivity.created_at.desc())
            .limit(limit)
        )
        proj_acts = list(db.execute(act_stmt).scalars().all())

        for act in proj_acts:
            actor_name = act.actor.full_name if act.actor else "Teammate"
            task_title = act.task.title if act.task else "task"
            
            deep_link = f"/projects/{act.project_id}"
            if act.task_id:
                deep_link += f"?taskId={act.task_id}"

            activities.append({
                "id": act.id,
                "entity_type": "project" if not act.task_id else "task",
                "title": _format_activity_title(act.action),
                "description": f"{actor_name} {act.details or 'updated work item'}",
                "actor_name": actor_name,
                "actor_avatar_url": None,
                "deep_link": deep_link,
                "created_at": act.created_at,
            })

    # 2. In-app notifications for the user
    notif_stmt = (
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(
            Notification.company_id == company_id,
            Notification.user_id == user_id,
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    user_notifs = list(db.execute(notif_stmt).scalars().all())

    for n in user_notifs:
        actor_name = n.actor.full_name if n.actor else "System"
        activities.append({
            "id": n.id,
            "entity_type": n.entity_type.value.lower() if hasattr(n.entity_type, 'value') else str(n.entity_type).lower(),
            "title": n.title,
            "description": n.message,
            "actor_name": actor_name,
            "actor_avatar_url": None,
            "deep_link": n.deep_link,
            "created_at": n.created_at,
        })

    # Deduplicate and sort by created_at descending
    seen_ids = set()
    unique_sorted = []
    for item in sorted(activities, key=lambda x: x["created_at"], reverse=True):
        if item["id"] not in seen_ids:
            seen_ids.add(item["id"])
            unique_sorted.append(item)
        if len(unique_sorted) >= limit:
            break

    return unique_sorted


def _format_activity_title(action: str) -> str:
    cleaned = action.replace("_", " ").title()
    if "Task Created" in cleaned:
        return "New Task"
    if "Task Assigned" in cleaned:
        return "Task Assignment"
    if "Task Completed" in cleaned:
        return "Task Completed"
    if "Task Status" in cleaned:
        return "Status Update"
    return cleaned
