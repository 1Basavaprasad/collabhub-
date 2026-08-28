import logging
import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember
from app.models.notification import Notification, NotificationEntityType
from app.models.notification_preference import NotificationPreference
from app.models.task import Task
from app.repositories.company import get_company_by_id, get_company_membership
from app.repositories.notification import (
    count_unread_notifications,
    create_notification,
    delete_notification,
    get_notification_by_id,
    get_notifications_for_user,
    get_or_create_user_preferences,
    mark_all_notifications_as_read,
    mark_notification_as_read,
    update_user_preferences,
)
from app.repositories.user import get_user_by_id

logger = logging.getLogger(__name__)


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


def create_notification_if_enabled(
    db: Session,
    user_id: uuid.UUID,
    company_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    entity_type: NotificationEntityType,
    entity_id: uuid.UUID | None,
    action: str,
    title: str,
    message: str,
    deep_link: str | None = None,
    preference_key: str | None = None,
) -> Notification | None:
    # Rule 1: Never notify the actor of their own direct actions
    if actor_id is not None and actor_id == user_id:
        return None

    # Rule 2: Check user preference if specified
    if preference_key:
        prefs = get_or_create_user_preferences(db, user_id)
        if hasattr(prefs, preference_key) and not getattr(prefs, preference_key):
            # User opted out of this notification type
            return None

    try:
        return create_notification(
            db=db,
            user_id=user_id,
            company_id=company_id,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            title=title,
            message=message,
            deep_link=deep_link,
        )
    except Exception as exc:
        logger.error(f"Failed to create notification for user {user_id}: {exc}")
        return None


# Domain Event Notifiers

def notify_task_assigned(
    db: Session,
    task: Task,
    actor_id: uuid.UUID | None,
    new_assignee_id: uuid.UUID,
) -> Notification | None:
    actor = get_user_by_id(db, actor_id) if actor_id else None
    actor_name = actor.full_name if actor else "A teammate"
    project_name = task.project.name if task.project else "Project"

    title = "New Task Assigned"
    message = f"{actor_name} assigned you to task '{task.title}' in {project_name}."
    deep_link = f"/projects/{task.project_id}?taskId={task.id}"

    return create_notification_if_enabled(
        db=db,
        user_id=new_assignee_id,
        company_id=task.company_id,
        actor_id=actor_id,
        entity_type=NotificationEntityType.TASK,
        entity_id=task.id,
        action="TASK_ASSIGNED",
        title=title,
        message=message,
        deep_link=deep_link,
        preference_key="task_assignments_in_app",
    )


def notify_task_reassigned(
    db: Session,
    task: Task,
    actor_id: uuid.UUID | None,
    new_assignee_id: uuid.UUID,
) -> Notification | None:
    return notify_task_assigned(db, task, actor_id, new_assignee_id)


def notify_task_completed(
    db: Session,
    task: Task,
    actor_id: uuid.UUID | None,
) -> Notification | None:
    # Notify task creator if different from completer
    recipient_id = task.created_by
    if not recipient_id or recipient_id == actor_id:
        return None

    actor = get_user_by_id(db, actor_id) if actor_id else None
    actor_name = actor.full_name if actor else "A teammate"
    project_name = task.project.name if task.project else "Project"

    title = "Task Completed"
    message = f"{actor_name} completed task '{task.title}' in {project_name}."
    deep_link = f"/projects/{task.project_id}?taskId={task.id}"

    return create_notification_if_enabled(
        db=db,
        user_id=recipient_id,
        company_id=task.company_id,
        actor_id=actor_id,
        entity_type=NotificationEntityType.TASK,
        entity_id=task.id,
        action="TASK_COMPLETED",
        title=title,
        message=message,
        deep_link=deep_link,
        preference_key="task_updates_in_app",
    )


def notify_team_member_added(
    db: Session,
    team_id: uuid.UUID,
    team_name: str,
    company_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    target_user_id: uuid.UUID,
) -> Notification | None:
    actor = get_user_by_id(db, actor_id) if actor_id else None
    actor_name = actor.full_name if actor else "A team lead"

    title = "Added to Team"
    message = f"{actor_name} added you to team '{team_name}'."
    deep_link = f"/teams/{team_id}"

    return create_notification_if_enabled(
        db=db,
        user_id=target_user_id,
        company_id=company_id,
        actor_id=actor_id,
        entity_type=NotificationEntityType.TEAM,
        entity_id=team_id,
        action="TEAM_INVITATION",
        title=title,
        message=message,
        deep_link=deep_link,
        preference_key="team_activity_in_app",
    )


def notify_project_member_added(
    db: Session,
    project_id: uuid.UUID,
    project_name: str,
    company_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    target_user_id: uuid.UUID,
) -> Notification | None:
    actor = get_user_by_id(db, actor_id) if actor_id else None
    actor_name = actor.full_name if actor else "A project admin"

    title = "Added to Project"
    message = f"{actor_name} added you to project '{project_name}'."
    deep_link = f"/projects/{project_id}"

    return create_notification_if_enabled(
        db=db,
        user_id=target_user_id,
        company_id=company_id,
        actor_id=actor_id,
        entity_type=NotificationEntityType.PROJECT,
        entity_id=project_id,
        action="PROJECT_INVITATION",
        title=title,
        message=message,
        deep_link=deep_link,
        preference_key="project_activity_in_app",
    )


def notify_chat_mention(
    db: Session,
    team_id: uuid.UUID,
    team_name: str,
    company_id: uuid.UUID,
    sender_id: uuid.UUID,
    mentioned_user_id: uuid.UUID,
    snippet: str,
) -> Notification | None:
    sender = get_user_by_id(db, sender_id)
    sender_name = sender.full_name if sender else "A teammate"

    # Truncate snippet
    short_snippet = snippet[:120] + "..." if len(snippet) > 120 else snippet
    title = f"Mentioned in #{team_name}"
    message = f"{sender_name}: \"{short_snippet}\""
    deep_link = f"/teams/{team_id}?tab=chat"

    return create_notification_if_enabled(
        db=db,
        user_id=mentioned_user_id,
        company_id=company_id,
        actor_id=sender_id,
        entity_type=NotificationEntityType.MESSAGE,
        entity_id=team_id,
        action="CHAT_MENTION",
        title=title,
        message=message,
        deep_link=deep_link,
        preference_key="mentions_in_app",
    )


def notify_company_invitation(
    db: Session,
    company_id: uuid.UUID,
    company_name: str,
    target_user_id: uuid.UUID,
    inviter_id: uuid.UUID,
    role_name: str,
) -> Notification | None:
    inviter = get_user_by_id(db, inviter_id)
    inviter_name = inviter.full_name if inviter else "An administrator"

    title = "Workspace Invitation"
    message = f"{inviter_name} invited you to join '{company_name}' as {role_name}."
    deep_link = "/inbox?tab=invitations"

    return create_notification_if_enabled(
        db=db,
        user_id=target_user_id,
        company_id=company_id,
        actor_id=inviter_id,
        entity_type=NotificationEntityType.INVITATION,
        entity_id=company_id,
        action="COMPANY_INVITATION",
        title=title,
        message=message,
        deep_link=deep_link,
        preference_key="invitations_in_app",
    )


# Notification Query Services

def get_user_notifications_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    filter_type: str | None = None,
) -> tuple[Sequence[Notification], int]:
    _get_validated_membership(db, company_id, user_id)
    return get_notifications_for_user(
        db=db,
        user_id=user_id,
        company_id=company_id,
        page=page,
        limit=limit,
        filter_type=filter_type,
    )


def get_unread_notification_count_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    _get_validated_membership(db, company_id, user_id)
    return count_unread_notifications(db=db, user_id=user_id, company_id=company_id)


def mark_notification_read_service(
    db: Session,
    company_id: uuid.UUID,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Notification:
    _get_validated_membership(db, company_id, user_id)
    notif = get_notification_by_id(db, notification_id)
    if not notif or notif.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    if notif.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this notification.",
        )
    return mark_notification_as_read(db, notif)


def mark_all_notifications_read_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> int:
    _get_validated_membership(db, company_id, user_id)
    return mark_all_notifications_as_read(db, user_id=user_id, company_id=company_id)


def delete_notification_service(
    db: Session,
    company_id: uuid.UUID,
    notification_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    _get_validated_membership(db, company_id, user_id)
    notif = get_notification_by_id(db, notification_id)
    if not notif or notif.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    if notif.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this notification.",
        )
    delete_notification(db, notif)


# Preference Services

def get_user_preferences_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> NotificationPreference:
    _get_validated_membership(db, company_id, user_id)
    return get_or_create_user_preferences(db, user_id=user_id)


def update_user_preferences_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    update_data: dict,
) -> NotificationPreference:
    _get_validated_membership(db, company_id, user_id)
    pref = get_or_create_user_preferences(db, user_id=user_id)
    return update_user_preferences(db, pref, update_data)
