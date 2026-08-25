import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole
from app.models.user import User


def create_company(
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
    company = Company(
        name=name,
        description=description,
        industry=industry,
        company_size=company_size,
        country=country,
        city=city,
        website=website,
        logo_url=logo_url,
    )

    db.add(company)
    db.flush()

    # Creator automatically becomes an OWNER in company_members
    membership = CompanyMember(
        company_id=company.id,
        user_id=creator_user_id,
        role=CompanyRole.OWNER,
        designation=creator_designation,
        department=creator_department,
    )
    db.add(membership)
    db.commit()
    db.refresh(company)

    return company


def get_company_by_id(
    db: Session,
    company_id: uuid.UUID,
    include_deleted: bool = False,
) -> Company | None:
    statement = select(Company).where(
        Company.id == company_id
    )
    if not include_deleted:
        statement = statement.where(Company.is_deleted.is_(False))

    return db.execute(statement).scalar_one_or_none()


def lock_company_for_update(
    db: Session,
    company_id: uuid.UUID,
    include_deleted: bool = False,
) -> Company | None:
    statement = (
        select(Company)
        .where(Company.id == company_id)
    )
    if not include_deleted:
        statement = statement.where(Company.is_deleted.is_(False))
    statement = statement.with_for_update()
    return db.execute(statement).scalar_one_or_none()


def get_company_membership(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    include_deleted_company: bool = False,
) -> CompanyMember | None:
    statement = (
        select(CompanyMember)
        .join(Company, CompanyMember.company_id == Company.id)
        .options(
            joinedload(CompanyMember.user),
            joinedload(CompanyMember.company),
        )
        .where(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == user_id,
        )
    )
    if not include_deleted_company:
        statement = statement.where(Company.is_deleted.is_(False))

    return db.execute(statement).scalar_one_or_none()


def get_companies_for_user(
    db: Session,
    user_id: uuid.UUID,
) -> list[Company]:
    statement = (
        select(Company)
        .join(CompanyMember, Company.id == CompanyMember.company_id)
        .where(
            CompanyMember.user_id == user_id,
            Company.is_deleted.is_(False),
        )
        .order_by(CompanyMember.joined_at.asc())
    )

    return list(db.execute(statement).scalars().all())


def get_active_or_first_company_for_user(
    db: Session,
    user_id: uuid.UUID,
) -> Company | None:
    statement = (
        select(Company)
        .join(CompanyMember, Company.id == CompanyMember.company_id)
        .where(
            CompanyMember.user_id == user_id,
            Company.is_deleted.is_(False),
        )
        .order_by(CompanyMember.joined_at.asc())
        .limit(1)
    )

    return db.execute(statement).scalar_one_or_none()


def soft_delete_company(
    db: Session,
    company: Company,
) -> Company:
    company.is_deleted = True
    company.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(company)
    return company


def add_company_member(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    role: CompanyRole = CompanyRole.MEMBER,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyMember:
    membership = CompanyMember(
        company_id=company_id,
        user_id=user_id,
        role=role,
        designation=designation,
        department=department,
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    return membership


def get_company_members(
    db: Session,
    company_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    role: CompanyRole | None = None,
    department: str | None = None,
    search: str | None = None,
) -> tuple[list[CompanyMember], int]:
    base_query = (
        select(CompanyMember)
        .join(User, CompanyMember.user_id == User.id)
        .where(CompanyMember.company_id == company_id)
    )

    if role is not None:
        base_query = base_query.where(CompanyMember.role == role)
    if department and department.strip():
        base_query = base_query.where(CompanyMember.department.ilike(f"%{department.strip()}%"))
    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.username.ilike(term),
                CompanyMember.designation.ilike(term),
            )
        )

    count_statement = select(func.count()).select_from(base_query.subquery())
    total = db.execute(count_statement).scalar_one()

    items_statement = (
        base_query
        .options(contains_eager(CompanyMember.user))
        .order_by(CompanyMember.joined_at.asc(), CompanyMember.id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = list(db.execute(items_statement).scalars().all())

    return items, total


def count_company_owners(
    db: Session,
    company_id: uuid.UUID,
) -> int:
    statement = (
        select(func.count(CompanyMember.id))
        .where(
            CompanyMember.company_id == company_id,
            CompanyMember.role == CompanyRole.OWNER,
        )
    )

    return db.execute(statement).scalar_one()


def update_company_member(
    db: Session,
    membership: CompanyMember,
    role: CompanyRole | None = None,
    designation: str | None = None,
    department: str | None = None,
) -> CompanyMember:
    if role is not None:
        membership.role = role

    if designation is not None:
        membership.designation = designation.strip() if designation.strip() else None

    if department is not None:
        membership.department = department.strip() if department.strip() else None

    db.commit()
    db.refresh(membership)

    return membership


def update_company(
    db: Session,
    company: Company,
    name: str | None = None,
    description: str | None = None,
    industry: str | None = None,
    company_size: str | None = None,
    country: str | None = None,
    city: str | None = None,
    website: str | None = None,
    logo_url: str | None = None,
) -> Company:
    if name is not None:
        company.name = name

    if description is not None:
        company.description = description

    if industry is not None:
        company.industry = industry

    if company_size is not None:
        company.company_size = company_size

    if country is not None:
        company.country = country

    if city is not None:
        company.city = city

    if website is not None:
        company.website = website

    if logo_url is not None:
        company.logo_url = logo_url

    db.commit()
    db.refresh(company)

    return company


def remove_company_member(
    db: Session,
    membership: CompanyMember,
) -> None:
    db.delete(membership)
    db.commit()


def get_company_membership_for_update(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> CompanyMember | None:
    statement = (
        select(CompanyMember)
        .where(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == user_id,
        )
        .with_for_update(of=CompanyMember)
    )
    return db.execute(statement).scalar_one_or_none()