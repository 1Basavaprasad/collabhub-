import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.models.team import Team
from app.models.team_chat_message import TeamChatMessage
from app.models.team_member import TeamRole
from app.repositories.company import get_company_by_id, get_company_membership
from app.repositories.team import get_team_member, get_team_simple
from app.repositories.team_chat import (
    create_team_chat_message,
    delete_team_chat_message,
    get_team_chat_message_by_id,
    get_team_unread_count,
    list_pinned_team_chat_messages,
    list_team_chat_messages,
    mark_team_chat_read,
    search_team_chat_messages,
    soft_delete_team_chat_message,
    toggle_pin_team_chat_message,
    toggle_team_chat_reaction,
    update_team_chat_message,
)
from app.schemas.team_chat import (
    ChatMessageCreate,
    ChatMessageListResponse,
    ChatMessageResponse,
    ChatMessageUpdate,
    ChatReactionGroupResponse,
    ChatReplySummary,
    ChatSenderSummary,
    TeamUnreadCountResponse,
)


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


def _get_validated_team(
    db: Session,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> Team:
    team = get_team_simple(db, team_id)
    if not team or team.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found in this company workspace.",
        )
    return team


def _check_team_access(
    db: Session,
    membership: CompanyMember,
    team: Team,
    user_id: uuid.UUID,
) -> None:
    # Company Owner/Admin or active Team Member has access
    if membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN):
        return

    team_member = get_team_member(db, team.id, user_id)
    if not team_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this team to access its private chat.",
        )


def _format_message_response(
    msg: TeamChatMessage,
    current_user_id: uuid.UUID,
) -> ChatMessageResponse:
    # Reactions group
    reaction_groups: dict[str, dict] = {}
    for r in getattr(msg, "reactions", []):
        if r.emoji not in reaction_groups:
            reaction_groups[r.emoji] = {
                "emoji": r.emoji,
                "count": 0,
                "users": [],
                "has_reacted": False,
            }
        reaction_groups[r.emoji]["count"] += 1
        if r.user:
            reaction_groups[r.emoji]["users"].append(ChatSenderSummary.model_validate(r.user))
        if r.user_id == current_user_id:
            reaction_groups[r.emoji]["has_reacted"] = True

    reactions = [ChatReactionGroupResponse(**g) for g in reaction_groups.values()]

    # Mentions
    mentions = [
        ChatSenderSummary.model_validate(m.mentioned_user)
        for m in getattr(msg, "mentions", [])
        if m.mentioned_user
    ]

    # Reply To
    reply_to = None
    if msg.reply_to_message:
        orig = msg.reply_to_message
        sender_name = (
            orig.sender.full_name or orig.sender.username
            if orig.sender
            else "Team Member"
        )
        snippet = orig.message[:120] if orig.message else ""
        if len(orig.message or "") > 120:
            snippet += "..."
        reply_to = ChatReplySummary(
            id=orig.id,
            sender_id=orig.sender_id,
            sender_name=sender_name,
            message_snippet=snippet,
            is_deleted=bool(orig.deleted_at),
        )

    # Sender & Pinned By
    sender = ChatSenderSummary.model_validate(msg.sender) if msg.sender else None
    pinned_by = ChatSenderSummary.model_validate(msg.pinned_by) if msg.pinned_by else None

    return ChatMessageResponse(
        id=msg.id,
        team_id=msg.team_id,
        sender_id=msg.sender_id,
        message=msg.message,
        reply_to_message_id=msg.reply_to_message_id,
        is_pinned=msg.is_pinned,
        pinned_at=msg.pinned_at,
        pinned_by_id=msg.pinned_by_id,
        edited_at=msg.edited_at,
        deleted_at=msg.deleted_at,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
        sender=sender,
        pinned_by=pinned_by,
        reply_to=reply_to,
        reactions=reactions,
        mentions=mentions,
    )


def send_team_message_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    data: ChatMessageCreate,
) -> ChatMessageResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    # Verify reply_to_message_id belongs to this team if provided
    if data.reply_to_message_id:
        parent_msg = get_team_chat_message_by_id(db, data.reply_to_message_id)
        if not parent_msg or parent_msg.team_id != team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent reply message not found in this team.",
            )

    msg = create_team_chat_message(
        db=db,
        team_id=team.id,
        sender_id=current_user_id,
        message=data.message,
        reply_to_message_id=data.reply_to_message_id,
        mentioned_user_ids=data.mentioned_user_ids,
    )
    return _format_message_response(msg, current_user_id)


def list_team_messages_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
) -> ChatMessageListResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    messages, total_count = list_team_chat_messages(
        db=db,
        team_id=team.id,
        limit=limit,
        offset=offset,
    )

    formatted = [_format_message_response(m, current_user_id) for m in messages]
    has_more = (offset + limit) < total_count

    return ChatMessageListResponse(
        messages=formatted,
        total_count=total_count,
        has_more=has_more,
    )


def update_team_message_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
    data: ChatMessageUpdate,
) -> ChatMessageResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    chat_message = get_team_chat_message_by_id(db, message_id)
    if not chat_message or chat_message.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat message not found.",
        )

    if chat_message.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a deleted message.",
        )

    # Only message author can edit
    if chat_message.sender_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own messages.",
        )

    updated = update_team_chat_message(
        db=db,
        chat_message=chat_message,
        message=data.message,
        mentioned_user_ids=data.mentioned_user_ids,
    )
    return _format_message_response(updated, current_user_id)


def delete_team_message_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
) -> None:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    chat_message = get_team_chat_message_by_id(db, message_id)
    if not chat_message or chat_message.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat message not found.",
        )

    is_author = chat_message.sender_id == current_user_id
    is_company_admin = membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN)

    team_member = get_team_member(db, team.id, current_user_id)
    is_team_lead = team_member and team_member.role == TeamRole.LEAD

    if not is_author and not is_company_admin and not is_team_lead:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this message.",
        )

    soft_delete_team_chat_message(db, chat_message)


def toggle_message_reaction_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
    emoji: str,
) -> ChatMessageResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    chat_message = get_team_chat_message_by_id(db, message_id)
    if not chat_message or chat_message.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat message not found.",
        )

    if chat_message.deleted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot react to a deleted message.",
        )

    updated = toggle_team_chat_reaction(
        db=db,
        message_id=message_id,
        user_id=current_user_id,
        emoji=emoji,
    )
    return _format_message_response(updated, current_user_id)


def toggle_pin_message_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID,
) -> ChatMessageResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    chat_message = get_team_chat_message_by_id(db, message_id)
    if not chat_message or chat_message.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat message not found.",
        )

    is_company_admin = membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN)
    team_member = get_team_member(db, team.id, current_user_id)
    is_team_lead = team_member and team_member.role == TeamRole.LEAD

    if not is_company_admin and not is_team_lead:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leads and workspace admins can pin messages.",
        )

    updated = toggle_pin_team_chat_message(
        db=db,
        chat_message=chat_message,
        current_user_id=current_user_id,
    )
    return _format_message_response(updated, current_user_id)


def list_pinned_messages_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
) -> list[ChatMessageResponse]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    messages = list_pinned_team_chat_messages(db, team.id)
    return [_format_message_response(m, current_user_id) for m in messages]


def search_team_messages_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    query: str,
    limit: int = 50,
) -> ChatMessageListResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    messages, total_count = search_team_chat_messages(
        db=db,
        team_id=team.id,
        query=query,
        limit=limit,
    )
    return ChatMessageListResponse(
        messages=[_format_message_response(m, current_user_id) for m in messages],
        total_count=total_count,
        has_more=False,
    )


def mark_team_chat_read_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
    team_id: uuid.UUID,
    message_id: uuid.UUID | None = None,
) -> TeamUnreadCountResponse:
    _, membership = _get_validated_membership(db, company_id, current_user_id)
    team = _get_validated_team(db, company_id, team_id)
    _check_team_access(db, membership, team, current_user_id)

    read_rec = mark_team_chat_read(
        db=db,
        team_id=team.id,
        user_id=current_user_id,
        message_id=message_id,
    )

    unread_count, last_msg_id, last_read_at = get_team_unread_count(
        db=db,
        team_id=team.id,
        user_id=current_user_id,
    )

    return TeamUnreadCountResponse(
        team_id=team.id,
        unread_count=unread_count,
        last_read_message_id=last_msg_id,
        last_read_at=last_read_at,
    )


def get_user_teams_unread_counts_service(
    db: Session,
    current_user_id: uuid.UUID,
    company_id: uuid.UUID,
) -> list[TeamUnreadCountResponse]:
    _, membership = _get_validated_membership(db, company_id, current_user_id)

    from app.repositories.team import get_company_teams
    is_admin = membership.role in (CompanyRole.OWNER, CompanyRole.ADMIN)
    if is_admin:
        teams, _ = get_company_teams(db, company_id=company_id, limit=200, status_filter="active")
    else:
        teams, _ = get_company_teams(db, company_id=company_id, user_id_filter=current_user_id, limit=200, status_filter="active")

    results: list[TeamUnreadCountResponse] = []
    for t in teams:
        unread_count, last_msg_id, last_read_at = get_team_unread_count(
            db=db,
            team_id=t.id,
            user_id=current_user_id,
        )
        results.append(
            TeamUnreadCountResponse(
                team_id=t.id,
                unread_count=unread_count,
                last_read_message_id=last_msg_id,
                last_read_at=last_read_at,
            )
        )
    return results

