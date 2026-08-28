import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.services.notification import (
    delete_notification_service,
    get_unread_notification_count_service,
    get_user_notifications_service,
    get_user_preferences_service,
    mark_all_notifications_read_service,
    mark_notification_read_service,
    update_user_preferences_service,
)

router = APIRouter(
    prefix="/companies/{company_id}/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=PaginatedResponse[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="List current user's notifications in a workspace with pagination and filters",
)
def list_notifications(
    company_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    filter_type: str | None = Query(
        None,
        alias="filter",
        description="Filter type: all, unread, mentions, assignments, invitations, system",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = get_user_notifications_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
        page=page,
        limit=limit,
        filter_type=filter_type,
    )
    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unread notification count for current user in workspace",
)
def get_unread_notification_count(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = get_unread_notification_count_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
    )
    return {"unread_count": count}


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a notification as read",
)
def mark_notification_read(
    company_id: uuid.UUID,
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return mark_notification_read_service(
        db=db,
        company_id=company_id,
        notification_id=notification_id,
        user_id=current_user.id,
    )


@router.post(
    "/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read for current user in workspace",
)
def mark_all_notifications_read(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    count = mark_all_notifications_read_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
    )
    return {
        "message": "All notifications marked as read.",
        "marked_read": count,
    }


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notification",
)
def delete_notification_endpoint(
    company_id: uuid.UUID,
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    delete_notification_service(
        db=db,
        company_id=company_id,
        notification_id=notification_id,
        user_id=current_user.id,
    )


# Preferences Endpoints

@router.get(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user's notification preferences",
)
def get_notification_preferences(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_preferences_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
    )


@router.patch(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update user's notification preferences",
)
def update_notification_preferences(
    company_id: uuid.UUID,
    data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = data.model_dump(exclude_unset=True)
    return update_user_preferences_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
        update_data=updates,
    )
