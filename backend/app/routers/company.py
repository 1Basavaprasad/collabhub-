import uuid

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, BackgroundTasks, Depends, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.company_member import CompanyRole
from app.models.user import User

from app.schemas.company import (
    CompanyCreate,
    CompanyMemberCreate,
    CompanyMemberResponse,
    CompanyMemberUpdate,
    CompanyMemberWithUserResponse,
    CompanyResponse,
    CompanyUpdate,
)

from app.schemas.company_invitation import (
    CompanyInvitationCreate,
    CompanyInvitationResponse,
    CompanyInvitationVerifyResponse,
)

from app.services.company import (
    add_member_to_company_service,
    create_company_service,
    get_company_members_service,
    get_company_service,
    get_my_companies_list,
    get_my_company,
    leave_company_service,
    remove_member_from_company_service,
    update_company_member_service,
    update_company_service,
)

from app.services.company_invitation import (
    accept_company_invitation_service,
    create_company_invitation_service,
    get_company_invitations_service,
    revoke_company_invitation_service,
    verify_company_invitation_service,
)


router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


# ============================================================
# COMPANY INVITATION VERIFICATION
# ============================================================

@router.get(
    "/invitations/verify/{token}",
    response_model=CompanyInvitationVerifyResponse,
)
def verify_company_invitation(
    token: str,
    db: Session = Depends(get_db),
):
    invitation, company = verify_company_invitation_service(
        db=db,
        raw_token=token,
    )

    return CompanyInvitationVerifyResponse(
        company_id=invitation.company_id,
        company_name=company.name,
        email=invitation.email,
        role=invitation.role,
        designation=invitation.designation,
        department=invitation.department,
        expires_at=invitation.expires_at,
    )


# ============================================================
# COMPANY INVITATION ACCEPTANCE
# ============================================================

@router.post(
    "/invitations/accept/{token}",
    response_model=CompanyInvitationResponse,
)
def accept_company_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return accept_company_invitation_service(
        db=db,
        raw_token=token,
        user_id=current_user.id,
    )


# ============================================================
# COMPANY
# ============================================================

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


# ============================================================
# COMPANY MEMBERS
# ============================================================

@router.get(
    "/{company_id}/members",
    response_model=list[CompanyMemberWithUserResponse],
)
def get_company_members(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_company_members_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
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
    designation: str | None = None,
    department: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return add_member_to_company_service(
        db=db,
        company_id=company_id,
        current_user_id=current_user.id,
        new_user_id=user_id,
        role=role,
        designation=designation,
        department=department,
    )


@router.patch(
    "/{company_id}/members/{user_id}",
    response_model=CompanyMemberWithUserResponse,
)
def update_company_member(
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    data: CompanyMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_company_member_service(
        db=db,
        company_id=company_id,
        target_user_id=user_id,
        requesting_user_id=current_user.id,
        role=data.role,
        designation=data.designation,
        department=data.department,
    )


@router.delete(
    "/{company_id}/members/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove a member from the company",
)
def remove_company_member(
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return remove_member_from_company_service(
        db=db,
        company_id=company_id,
        requesting_user_id=current_user.id,
        target_user_id=user_id,
    )


@router.post(
    "/{company_id}/leave",
    status_code=status.HTTP_200_OK,
    summary="Leave a company",
)
def leave_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return leave_company_service(
        db=db,
        company_id=company_id,
        user_id=current_user.id,
    )


# ============================================================
# COMPANY INVITATIONS MANAGEMENT
# ============================================================

@router.get(
    "/{company_id}/invitations",
    response_model=list[CompanyInvitationResponse],
)
def get_company_invitations(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_company_invitations_service(
        db=db,
        company_id=company_id,
        requesting_user_id=current_user.id,
    )


@router.post(
    "/{company_id}/invitations",
    response_model=CompanyInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company_invitation(
    company_id: uuid.UUID,
    data: CompanyInvitationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitation, raw_token = create_company_invitation_service(
        db=db,
        company_id=company_id,
        inviter_user_id=current_user.id,
        email=data.email,
        role=data.role,
        designation=data.designation,
        department=data.department,
        background_tasks=background_tasks,
    )

    return invitation


@router.post(
    "/{company_id}/invitations/{invitation_id}/revoke",
    response_model=CompanyInvitationResponse,
)
def revoke_company_invitation(
    company_id: uuid.UUID,
    invitation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return revoke_company_invitation_service(
        db=db,
        company_id=company_id,
        invitation_id=invitation_id,
        requesting_user_id=current_user.id,
    )