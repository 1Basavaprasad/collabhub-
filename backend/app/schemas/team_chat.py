import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatSenderSummary(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Text content of the message",
    )
    reply_to_message_id: uuid.UUID | None = Field(
        default=None,
        description="Optional ID of the message being replied to",
    )
    mentioned_user_ids: list[uuid.UUID] | None = Field(
        default=None,
        description="Optional list of explicitly mentioned user IDs",
    )

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty.")
        if len(trimmed) > 5000:
            raise ValueError("Message cannot exceed 5000 characters.")
        return trimmed


class ChatMessageUpdate(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Updated text content of the message",
    )
    mentioned_user_ids: list[uuid.UUID] | None = Field(
        default=None,
        description="Optional list of explicitly mentioned user IDs",
    )

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty.")
        if len(trimmed) > 5000:
            raise ValueError("Message cannot exceed 5000 characters.")
        return trimmed


class ChatReactionToggle(BaseModel):
    emoji: str = Field(
        ...,
        min_length=1,
        max_length=32,
        description="Emoji string, e.g. 👍, ❤️, 🎉, 👀, ✅, 🚀, 🔥, 👏",
    )

    @field_validator("emoji")
    @classmethod
    def validate_emoji(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Emoji cannot be empty.")
        if len(trimmed) > 32:
            raise ValueError("Emoji string cannot exceed 32 characters.")
        return trimmed


class ChatReactionGroupResponse(BaseModel):
    emoji: str
    count: int
    users: list[ChatSenderSummary] = []
    has_reacted: bool = False

    model_config = ConfigDict(from_attributes=True)


class ChatReplySummary(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    message_snippet: str
    is_deleted: bool = False

    model_config = ConfigDict(from_attributes=True)


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    sender_id: uuid.UUID
    message: str
    reply_to_message_id: uuid.UUID | None = None
    is_pinned: bool = False
    pinned_at: datetime | None = None
    pinned_by_id: uuid.UUID | None = None
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    sender: ChatSenderSummary | None = None
    pinned_by: ChatSenderSummary | None = None
    reply_to: ChatReplySummary | None = None
    reactions: list[ChatReactionGroupResponse] = []
    mentions: list[ChatSenderSummary] = []

    model_config = ConfigDict(from_attributes=True)


class ChatMessageListResponse(BaseModel):
    messages: list[ChatMessageResponse]
    total_count: int
    has_more: bool = False


class TeamUnreadCountResponse(BaseModel):
    team_id: uuid.UUID
    unread_count: int
    last_read_message_id: uuid.UUID | None = None
    last_read_at: datetime | None = None


class MarkChatReadRequest(BaseModel):
    message_id: uuid.UUID | None = Field(
        default=None,
        description="Optional latest read message ID; if omitted, marks latest available message as read",
    )
