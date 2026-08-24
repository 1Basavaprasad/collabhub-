import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole


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
    )
    db.add(membership)
    db.commit()
    db.refresh(company)

    return company


def get_company_by_id(
    db: Session,
    company_id: uuid.UUID,
) -> Company | None:
    statement = select(Company).where(
        Company.id == company_id
    )

    return db.execute(statement).scalar_one_or_none()


def get_company_membership(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> CompanyMember | None:
    statement = select(CompanyMember).where(
        CompanyMember.company_id == company_id,
        CompanyMember.user_id == user_id,
    )

    return db.execute(statement).scalar_one_or_none()


def get_companies_for_user(
    db: Session,
    user_id: uuid.UUID,
) -> list[Company]:
    statement = (
        select(Company)
        .join(CompanyMember, Company.id == CompanyMember.company_id)
        .where(CompanyMember.user_id == user_id)
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
        .where(CompanyMember.user_id == user_id)
        .order_by(CompanyMember.joined_at.asc())
        .limit(1)
    )

    return db.execute(statement).scalar_one_or_none()


def add_company_member(
    db: Session,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    role: CompanyRole = CompanyRole.MEMBER,
) -> CompanyMember:
    membership = CompanyMember(
        company_id=company_id,
        user_id=user_id,
        role=role,
    )

    db.add(membership)
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