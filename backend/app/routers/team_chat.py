import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.team_chat import (
    ChatMessageCreate,
    ChatMessageListResponse,
    ChatMessageResponse,
    ChatMessageUpdate,
    ChatReactionToggle,
    MarkChatReadRequest,
    TeamUnreadCountResponse,
)
from app.services.team_chat import (
    delete_team_message_service,
    get_user_teams_unread_counts_service,
    list_pinned_messages_service,
    list_team_messages_service,
    mark_team_chat_read_service,
    search_team_messages_service,
    send_team_message_service,
    toggle_message_reaction_service,
    toggle_pin_message_service,
    update_team_message_service,
)

router = APIRouter(
    prefix="/companies/{company_id}/teams/{team_id}/messages",
    tags=["Team Chat"],
)

team_chat_reads_router = APIRouter(
    prefix="/companies/{company_id}/teams",
    tags=["Team Chat"],
)


@router.get(
    "",
    response_model=ChatMessageListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all messages in a team's private chat with pagination",
)
def list_team_messages(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=200, description="Max messages to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_team_messages_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Post a message in a team's private chat",
)
def send_team_message(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return send_team_message_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        data=data,
    )


@router.get(
    "/search",
    response_model=ChatMessageListResponse,
    status_code=status.HTTP_200_OK,
    summary="Search messages within a team's private chat",
)
def search_team_messages(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    q: str = Query(..., min_length=1, description="Search keyword"),
    limit: int = Query(50, ge=1, le=100, description="Max search results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return search_team_messages_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        query=q,
        limit=limit,
    )


@router.get(
    "/pinned",
    response_model=list[ChatMessageResponse],
    status_code=status.HTTP_200_OK,
    summary="List all pinned messages for a team",
)
def list_pinned_messages(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_pinned_messages_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
    )


@router.patch(
    "/{message_id}",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Edit a message in team chat",
)
def update_team_message(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
    data: ChatMessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_team_message_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        message_id=message_id,
        data=data,
    )


@router.delete(
    "/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a message from team chat",
)
def delete_team_message(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_team_message_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        message_id=message_id,
    )


@router.post(
    "/{message_id}/reactions",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle emoji reaction on a message",
)
def toggle_message_reaction(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
    data: ChatReactionToggle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return toggle_message_reaction_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        message_id=message_id,
        emoji=data.emoji,
    )


@router.post(
    "/{message_id}/pin",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle pin status of a message",
)
def toggle_pin_message(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return toggle_pin_message_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        message_id=message_id,
    )


# Reads & Unread Counts Routes
team_chat_reads_router = APIRouter(
    prefix="/companies/{company_id}/team-chat",
    tags=["Team Chat"],
)


@team_chat_reads_router.post(
    "/{team_id}/read",
    response_model=TeamUnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark team chat as read",
)
def mark_team_chat_read_endpoint(
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: MarkChatReadRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message_id = data.message_id if data else None
    return mark_team_chat_read_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
        team_id=team_id,
        message_id=message_id,
    )


@team_chat_reads_router.get(
    "/unread-counts",
    response_model=list[TeamUnreadCountResponse],
    status_code=status.HTTP_200_OK,
    summary="Get unread message counts for all user teams",
)
def get_user_teams_unread_counts(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_teams_unread_counts_service(
        db=db,
        current_user_id=current_user.id,
        company_id=company_id,
    )

