import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.company_invitation import InvitationStatus
from app.models.company_member import CompanyRole


class CompanyInvitationCreate(BaseModel):
    email: EmailStr
    role: CompanyRole = CompanyRole.MEMBER

    designation: str | None = Field(
        default=None,
        max_length=100,
    )

    department: str | None = Field(
        default=None,
        max_length=100,
    )


class CompanyInvitationResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    email: EmailStr
    role: CompanyRole

    designation: str | None = None
    department: str | None = None

    status: InvitationStatus
    invited_by: uuid.UUID
    expires_at: datetime
    accepted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyInvitationVerifyResponse(BaseModel):
    company_id: uuid.UUID
    company_name: str
    email: EmailStr
    role: CompanyRole

    designation: str | None = None
    department: str | None = None

    expires_at: datetime