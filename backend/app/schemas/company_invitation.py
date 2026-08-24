import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.company_member import CompanyRole
from app.models.company_invitation import InvitationStatus


class CompanyInvitationCreate(BaseModel):
    email: EmailStr
    role: CompanyRole = CompanyRole.MEMBER


class CompanyInvitationResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    email: EmailStr
    role: CompanyRole
    status: InvitationStatus
    invited_by: uuid.UUID
    expires_at: datetime
    accepted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)