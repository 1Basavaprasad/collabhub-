import uuid

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.company_member import CompanyRole
from app.models.user import User

from app.schemas.company import (
    CompanyCreate,
    CompanyMemberResponse,
    CompanyResponse,
    CompanyUpdate,
)

from app.schemas.company_invitation import (
    CompanyInvitationCreate,
    CompanyInvitationResponse,
)

from app.services.company import (
    add_member_to_company_service,
    create_company_service,
    get_company_service,
    get_my_companies_list,
    get_my_company,
    update_company_service,
)

from app.services.company_invitation import (
    create_company_invitation_service,
)


router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_company_service(
        db=db,
        name=data.name,
        description=data.description,
        creator_user_id=current_user.id,
        industry=data.industry,
        company_size=data.company_size,
        country=data.country,
        city=data.city,
        website=data.website,
        logo_url=data.logo_url,
    )


@router.get(
    "/me",
    response_model=CompanyResponse,
)
def get_my_company_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_company(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "",
    response_model=list[CompanyResponse],
)
def list_my_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_companies_list(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
)
def get_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_company_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
    )


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
)
def update_company(
    company_id: uuid.UUID,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_company_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        industry=data.industry,
        company_size=data.company_size,
        country=data.country,
        city=data.city,
        website=data.website,
        logo_url=data.logo_url,
    )


@router.post(
    "/{company_id}/members",
    response_model=CompanyMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_company_member(
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    role: CompanyRole = CompanyRole.MEMBER,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_member_to_company_service(
        db=db,
        company_id=company_id,
        current_user_id=current_user.id,
        new_user_id=user_id,
        role=role,
    )


@router.post(
    "/{company_id}/invitations",
    response_model=CompanyInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company_invitation(
    company_id: uuid.UUID,
    data: CompanyInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitation, raw_token = create_company_invitation_service(
        db=db,
        company_id=company_id,
        inviter_user_id=current_user.id,
        email=data.email,
        role=data.role,
    )

    return invitation