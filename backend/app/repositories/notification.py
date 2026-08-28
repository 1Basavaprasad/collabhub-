import uuid
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from app.models.notification import Notification, NotificationEntityType
from app.models.notification_preference import NotificationPreference


def create_notification(
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
) -> Notification:
    notification = Notification(
        user_id=user_id,
        company_id=company_id,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        title=title,
        message=message,
        deep_link=deep_link,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications_for_user(
    db: Session,
    user_id: uuid.UUID,
    company_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    filter_type: str | None = None,
) -> tuple[Sequence[Notification], int]:
    base_query = (
        select(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.company_id == company_id,
        )
        .options(selectinload(Notification.actor))
    )

    if filter_type:
        clean_filter = filter_type.strip().lower()
        if clean_filter == "unread":
            base_query = base_query.where(Notification.is_read == False)  # noqa: E712
        elif clean_filter == "mentions":
            base_query = base_query.where(
                (Notification.entity_type == NotificationEntityType.MESSAGE)
                | (Notification.action.ilike("%mention%"))
            )
        elif clean_filter == "assignments":
            base_query = base_query.where(
                (Notification.entity_type == NotificationEntityType.TASK)
                | (Notification.action.ilike("%assign%"))
            )
        elif clean_filter == "invitations":
            base_query = base_query.where(
                (Notification.entity_type == NotificationEntityType.INVITATION)
                | (Notification.action.ilike("%invit%"))
            )
        elif clean_filter == "system":
            base_query = base_query.where(
                (Notification.entity_type == NotificationEntityType.SYSTEM)
                | (Notification.action.ilike("%system%"))
            )

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total = db.scalar(count_query) or 0

    # Paginate and order by newest first
    items_query = (
        base_query.order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = db.scalars(items_query).all()

    return items, total


def count_unread_notifications(
    db: Session,
    user_id: uuid.UUID,
    company_id: uuid.UUID,
) -> int:
    query = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.company_id == company_id,
        Notification.is_read == False,  # noqa: E712
    )
    return db.scalar(query) or 0


def get_notification_by_id(
    db: Session,
    notification_id: uuid.UUID,
) -> Notification | None:
    query = (
        select(Notification)
        .where(Notification.id == notification_id)
        .options(selectinload(Notification.actor))
    )
    return db.scalars(query).first()


def mark_notification_as_read(
    db: Session,
    notification: Notification,
) -> Notification:
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_notifications_as_read(
    db: Session,
    user_id: uuid.UUID,
    company_id: uuid.UUID,
) -> int:
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.company_id == company_id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(
            is_read=True,
            read_at=datetime.now(timezone.utc),
        )
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def delete_notification(
    db: Session,
    notification: Notification,
) -> None:
    db.delete(notification)
    db.commit()


# Preferences
def get_or_create_user_preferences(
    db: Session,
    user_id: uuid.UUID,
) -> NotificationPreference:
    query = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    pref = db.scalars(query).first()

    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return pref


def update_user_preferences(
    db: Session,
    pref: NotificationPreference,
    updates: dict,
) -> NotificationPreference:
    for key, value in updates.items():
        if value is not None and hasattr(pref, key):
            setattr(pref, key, value)

    db.commit()
    db.refresh(pref)
    return pref
