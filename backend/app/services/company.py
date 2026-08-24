import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.repositories.company import (
    add_company_member,
    count_company_owners,
    create_company,
    get_active_or_first_company_for_user,
    get_companies_for_user,
    get_company_by_id,
    get_company_members,
    get_company_membership,
    update_company,
    update_company_member,
)


def create_company_service(
    db: Session,
    name: str,
    description: str | None,
    creator_user_id: uuid.UUID,
    industry: str | None = None,
    company_size: str | None = None,
    country: str | None = None,
    city: str | None = None,
    website: str | None = None,
    logo_url: str | None = None,
    creator_designation: str | None = None,
    creator_department: str | None = None,
) -> Company:
    return create_company(
        db=db,
        name=name,
        description=description,
        creator_user_id=creator_user_id,
        industry=industry,
        company_size=company_size,
        country=country,
        city=city,
        website=website,
        logo_url=logo_url,
        creator_designation=creator_designation,
        creator_department=creator_department,
    )


def get_my_company(
    db: Session,
    user_id: uuid.UUID,
) -> Company:
    company = get_active_or_first_company_for_user(
        db,
        user_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not belong to any company.",
        )

    return company


def get_my_companies_list(
    db: Session,
    user_id: uuid.UUID,
) -> list[Company]:
    return get_companies_for_user(db, user_id)


def get_company_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Company:
    company = get_company_by_id(
        db,
        company_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    return company


def update_company_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str | None = None,
    description: str | None = None,
    industry: str | None = None,
    company_size: str | None = None,
    country: str | None = None,
    city: str | None = None,
    website: str | None = None,
    logo_url: str | None = None,
) -> Company:
    company = get_company_service(
        db=db,
        company_id=company_id,
        user_id=user_id,
    )

    membership = get_company_membership(db, company_id, user_id)
    if not membership or membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can update company settings.",
        )

    return update_company(
        db=db,
        company=company,
        name=name,
        description=description,
        industry=industry,
        company_size=company_size,
        country=country,
        city=city,
        website=website,
        logo_url=logo_url,
    )


def add_member_to_company_service(
    db: Session,
    company_id: uuid.UUID,
    current_user_id: uuid.UUID,
    new_user_id: uuid.UUID,
    role: CompanyRole = CompanyRole.MEMBER,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyMember:
    # Check current user is owner or admin
    membership = get_company_membership(db, company_id, current_user_id)
    if not membership or membership.role not in (CompanyRole.OWNER, CompanyRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can add members.",
        )

    existing = get_company_membership(db, company_id, new_user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this company.",
        )

    return add_company_member(
        db=db,
        company_id=company_id,
        user_id=new_user_id,
        role=role,
        designation=designation.strip() if designation and designation.strip() else None,
        department=department.strip() if department and department.strip() else None,
    )


def get_company_members_service(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[CompanyMember]:
    # User must be a member of the company to view its members
    membership = get_company_membership(db, company_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    return get_company_members(db, company_id)


def update_company_member_service(
    db: Session,
    company_id: uuid.UUID,
    target_user_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
    role: CompanyRole | None = None,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyMember:
    # 1. Check requesting user membership
    requesting_membership = get_company_membership(db, company_id, requesting_user_id)
    if not requesting_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company.",
        )

    # 2. Check target user membership
    target_membership = get_company_membership(db, company_id, target_user_id)
    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this company.",
        )

    # 3. Role-based permission checks
    if requesting_membership.role == CompanyRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members cannot modify company members.",
        )

    if requesting_membership.role == CompanyRole.ADMIN:
        if target_membership.role == CompanyRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot modify company owners.",
            )
        if role == CompanyRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins cannot promote members to owner.",
            )

    if requesting_membership.role == CompanyRole.OWNER:
        # Prevent demoting the last owner
        if target_membership.role == CompanyRole.OWNER and role is not None and role != CompanyRole.OWNER:
            owners_count = count_company_owners(db, company_id)
            if owners_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Company must have at least one owner.",
                )

    return update_company_member(
        db=db,
        membership=target_membership,
        role=role,
        designation=designation,
        department=department,
    )