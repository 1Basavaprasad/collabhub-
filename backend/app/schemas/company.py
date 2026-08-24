import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.company_member import CompanyRole


class CompanyCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=255,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    industry: str | None = Field(
        default=None,
        max_length=100,
    )
    company_size: str | None = Field(
        default=None,
        max_length=50,
    )
    country: str | None = Field(
        default=None,
        max_length=100,
    )
    city: str | None = Field(
        default=None,
        max_length=100,
    )
    website: str | None = Field(
        default=None,
        max_length=255,
    )
    logo_url: str | None = Field(
        default=None,
        max_length=500,
    )


class CompanyUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=255,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )
    industry: str | None = Field(
        default=None,
        max_length=100,
    )
    company_size: str | None = Field(
        default=None,
        max_length=50,
    )
    country: str | None = Field(
        default=None,
        max_length=100,
    )
    city: str | None = Field(
        default=None,
        max_length=100,
    )
    website: str | None = Field(
        default=None,
        max_length=255,
    )
    logo_url: str | None = Field(
        default=None,
        max_length=500,
    )


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    industry: str | None = None
    company_size: str | None = None
    country: str | None = None
    city: str | None = None
    website: str | None = None
    logo_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def profile_completeness(self) -> int:
        score = 0
        if self.name and self.name.strip():
            score += 20
        if self.description and self.description.strip():
            score += 15
        if self.industry and self.industry.strip():
            score += 15
        if self.company_size and self.company_size.strip():
            score += 10
        if self.country and self.country.strip():
            score += 10
        if self.city and self.city.strip():
            score += 10
        if self.website and self.website.strip():
            score += 10
        if self.logo_url and self.logo_url.strip():
            score += 10
        return min(score, 100)


class CompanyMemberUserSummary(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class CompanyMemberResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    user_id: uuid.UUID
    role: CompanyRole
    designation: str | None = None
    department: str | None = None
    joined_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyMemberWithUserResponse(CompanyMemberResponse):
    user: CompanyMemberUserSummary | None = None


class CompanyMemberCreate(BaseModel):
    user_id: uuid.UUID
    role: CompanyRole = CompanyRole.MEMBER
    designation: str | None = Field(
        default=None,
        max_length=100,
    )
    department: str | None = Field(
        default=None,
        max_length=100,
    )


class CompanyMemberUpdate(BaseModel):
    role: CompanyRole | None = None
    designation: str | None = Field(
        default=None,
        max_length=100,
    )
    department: str | None = Field(
        default=None,
        max_length=100,
    )