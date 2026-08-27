import uuid
from datetime import datetime, timezone
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.team_chat_mention import TeamChatMention
from app.models.team_chat_message import TeamChatMessage
from app.models.team_chat_reaction import TeamChatReaction
from app.models.team_chat_read import TeamChatRead
from app.models.team_member import TeamMember
from app.models.user import User


def get_eager_message_query():
    return (
        select(TeamChatMessage)
        .options(
            selectinload(TeamChatMessage.sender),
            selectinload(TeamChatMessage.pinned_by),
            selectinload(TeamChatMessage.reply_to_message).selectinload(TeamChatMessage.sender),
            selectinload(TeamChatMessage.reactions).selectinload(TeamChatReaction.user),
            selectinload(TeamChatMessage.mentions).selectinload(TeamChatMention.mentioned_user),
        )
    )


def create_team_chat_message(
    db: Session,
    team_id: uuid.UUID,
    sender_id: uuid.UUID,
    message: str,
    reply_to_message_id: uuid.UUID | None = None,
    mentioned_user_ids: list[uuid.UUID] | None = None,
) -> TeamChatMessage:
    chat_msg = TeamChatMessage(
        team_id=team_id,
        sender_id=sender_id,
        message=message,
        reply_to_message_id=reply_to_message_id,
    )
    db.add(chat_msg)
    db.flush()

    if mentioned_user_ids:
        # Add distinct mentions
        unique_ids = set(mentioned_user_ids)
        for u_id in unique_ids:
            mention = TeamChatMention(
                message_id=chat_msg.id,
                mentioned_user_id=u_id,
            )
            db.add(mention)

    db.commit()
    return get_team_chat_message_by_id(db, chat_msg.id) or chat_msg


def get_team_chat_message_by_id(
    db: Session,
    message_id: uuid.UUID,
) -> TeamChatMessage | None:
    db.expire_all()
    stmt = get_eager_message_query().where(TeamChatMessage.id == message_id)
    return db.execute(stmt).scalar_one_or_none()


def update_team_chat_message(
    db: Session,
    chat_message: TeamChatMessage,
    message: str,
    mentioned_user_ids: list[uuid.UUID] | None = None,
) -> TeamChatMessage:
    chat_message.message = message
    chat_message.edited_at = datetime.now(timezone.utc)

    if mentioned_user_ids is not None:
        # Replace mentions
        db.query(TeamChatMention).filter(TeamChatMention.message_id == chat_message.id).delete()
        for u_id in set(mentioned_user_ids):
            db.add(TeamChatMention(message_id=chat_message.id, mentioned_user_id=u_id))

    db.commit()
    return get_team_chat_message_by_id(db, chat_message.id) or chat_message


def soft_delete_team_chat_message(
    db: Session,
    chat_message: TeamChatMessage,
) -> TeamChatMessage:
    chat_message.deleted_at = datetime.now(timezone.utc)
    chat_message.message = "This message was deleted"
    db.commit()
    return get_team_chat_message_by_id(db, chat_message.id) or chat_message


def delete_team_chat_message(
    db: Session,
    chat_message: TeamChatMessage,
) -> bool:
    db.delete(chat_message)
    db.commit()
    return True


def toggle_team_chat_reaction(
    db: Session,
    message_id: uuid.UUID,
    user_id: uuid.UUID,
    emoji: str,
) -> TeamChatMessage:
    existing = db.execute(
        select(TeamChatReaction).where(
            TeamChatReaction.message_id == message_id,
            TeamChatReaction.user_id == user_id,
            TeamChatReaction.emoji == emoji,
        )
    ).scalar_one_or_none()

    if existing:
        db.delete(existing)
    else:
        new_reaction = TeamChatReaction(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(new_reaction)

    db.commit()
    return get_team_chat_message_by_id(db, message_id)


def toggle_pin_team_chat_message(
    db: Session,
    chat_message: TeamChatMessage,
    current_user_id: uuid.UUID,
) -> TeamChatMessage:
    if chat_message.is_pinned:
        chat_message.is_pinned = False
        chat_message.pinned_at = None
        chat_message.pinned_by_id = None
    else:
        chat_message.is_pinned = True
        chat_message.pinned_at = datetime.now(timezone.utc)
        chat_message.pinned_by_id = current_user_id

    db.commit()
    return get_team_chat_message_by_id(db, chat_message.id) or chat_message


def list_team_chat_messages(
    db: Session,
    team_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[TeamChatMessage], int]:
    count_stmt = (
        select(func.count(TeamChatMessage.id))
        .where(TeamChatMessage.team_id == team_id)
    )
    total_count = db.execute(count_stmt).scalar_one()

    stmt = (
        get_eager_message_query()
        .where(TeamChatMessage.team_id == team_id)
        .order_by(TeamChatMessage.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = list(db.execute(stmt).scalars().all())
    return messages, total_count


def list_pinned_team_chat_messages(
    db: Session,
    team_id: uuid.UUID,
) -> list[TeamChatMessage]:
    stmt = (
        get_eager_message_query()
        .where(
            TeamChatMessage.team_id == team_id,
            TeamChatMessage.is_pinned == True,
            TeamChatMessage.deleted_at.is_(None),
        )
        .order_by(TeamChatMessage.pinned_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def search_team_chat_messages(
    db: Session,
    team_id: uuid.UUID,
    query: str,
    limit: int = 50,
) -> tuple[list[TeamChatMessage], int]:
    q_trimmed = query.strip()
    if not q_trimmed:
        return [], 0

    base_query = (
        get_eager_message_query()
        .where(
            TeamChatMessage.team_id == team_id,
            TeamChatMessage.deleted_at.is_(None),
            TeamChatMessage.message.ilike(f"%{q_trimmed}%"),
        )
    )

    count_stmt = select(func.count()).select_from(base_query.subquery())
    total_count = db.execute(count_stmt).scalar_one()

    stmt = base_query.order_by(TeamChatMessage.created_at.desc()).limit(limit)
    messages = list(db.execute(stmt).scalars().all())
    return messages, total_count


def mark_team_chat_read(
    db: Session,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    message_id: uuid.UUID | None = None,
) -> TeamChatRead:
    read_record = db.execute(
        select(TeamChatRead).where(
            TeamChatRead.team_id == team_id,
            TeamChatRead.user_id == user_id,
        )
    ).scalar_one_or_none()

    target_msg_id = message_id
    if not target_msg_id:
        latest_msg = db.execute(
            select(TeamChatMessage.id)
            .where(TeamChatMessage.team_id == team_id)
            .order_by(TeamChatMessage.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        target_msg_id = latest_msg

    now = datetime.now(timezone.utc)
    if read_record:
        read_record.last_read_message_id = target_msg_id
        read_record.last_read_at = now
        read_record.updated_at = now
    else:
        read_record = TeamChatRead(
            team_id=team_id,
            user_id=user_id,
            last_read_message_id=target_msg_id,
            last_read_at=now,
            updated_at=now,
        )
        db.add(read_record)

    db.commit()
    db.refresh(read_record)
    return read_record


def get_team_unread_count(
    db: Session,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
) -> tuple[int, uuid.UUID | None, datetime | None]:
    read_record = db.execute(
        select(TeamChatRead).where(
            TeamChatRead.team_id == team_id,
            TeamChatRead.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not read_record or not read_record.last_read_at:
        count_stmt = (
            select(func.count(TeamChatMessage.id))
            .where(
                TeamChatMessage.team_id == team_id,
                TeamChatMessage.sender_id != user_id,
                TeamChatMessage.deleted_at.is_(None),
            )
        )
        count = db.execute(count_stmt).scalar_one()
        return count, None, None

    count_stmt = (
        select(func.count(TeamChatMessage.id))
        .where(
            TeamChatMessage.team_id == team_id,
            TeamChatMessage.sender_id != user_id,
            TeamChatMessage.deleted_at.is_(None),
            TeamChatMessage.created_at > read_record.last_read_at,
        )
    )
    count = db.execute(count_stmt).scalar_one()
    return count, read_record.last_read_message_id, read_record.last_read_at
