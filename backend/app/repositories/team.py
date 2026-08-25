import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload

from app.models.team import Team
from app.models.team_activity import TeamActivity
from app.models.team_member import TeamMember, TeamRole
from app.models.user import User


def log_team_activity(
    db: Session,
    team_id: uuid.UUID,
    actor_user_id: uuid.UUID | None,
    action: str,
    details: str | None = None,
) -> TeamActivity:
    activity = TeamActivity(
        team_id=team_id,
        actor_user_id=actor_user_id,
        action=action,
        details=details,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def get_team_activities(
    db: Session,
    team_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[TeamActivity], int]:
    base_query = select(TeamActivity).where(TeamActivity.team_id == team_id)

    count_statement = select(func.count()).select_from(base_query.subquery())
    total = db.execute(count_statement).scalar_one()

    statement = (
        base_query
        .options(
            selectinload(TeamActivity.actor),
        )
        .order_by(TeamActivity.created_at.desc(), TeamActivity.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = list(db.execute(statement).scalars().all())
    return items, total


def create_team(
    db: Session,
    company_id: uuid.UUID,
    name: str,
    description: str | None,
    creator_user_id: uuid.UUID,
    icon: str | None = "users",
    color: str | None = "indigo",
) -> Team:
    team = Team(
        company_id=company_id,
        name=name,
        description=description,
        icon=icon or "users",
        color=color or "indigo",
        is_archived=False,
    )
    db.add(team)
    db.flush()

    # Creator automatically becomes TeamRole.LEAD
    lead_member = TeamMember(
        team_id=team.id,
        user_id=creator_user_id,
        role=TeamRole.LEAD,
    )
    db.add(lead_member)
    db.commit()
    db.refresh(team)

    # Log initial creation activity
    log_team_activity(
        db=db,
        team_id=team.id,
        actor_user_id=creator_user_id,
        action="TEAM_CREATED",
        details=f"Team '{name}' was created.",
    )

    return team


def get_team_simple(
    db: Session,
    team_id: uuid.UUID,
) -> Team | None:
    """Lightweight team lookup without loading member relationships."""
    statement = select(Team).where(Team.id == team_id)
    return db.execute(statement).scalar_one_or_none()


def get_team_by_id(
    db: Session,
    team_id: uuid.UUID,
) -> Team | None:
    statement = (
        select(Team)
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
        )
        .where(Team.id == team_id)
    )
    return db.execute(statement).scalar_one_or_none()


def get_team_by_company_and_name(
    db: Session,
    company_id: uuid.UUID,
    name: str,
) -> Team | None:
    statement = (
        select(Team)
        .where(
            Team.company_id == company_id,
            func.lower(Team.name) == func.lower(name.strip()),
        )
    )
    return db.execute(statement).scalars().first()


def get_company_teams(
    db: Session,
    company_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    status_filter: str | None = None,
    user_id_filter: uuid.UUID | None = None,
    search: str | None = None,
    sort_by: str | None = None,
) -> tuple[list[Team], int]:
    base_query = select(Team).where(Team.company_id == company_id)

    if status_filter == "active":
        base_query = base_query.where(Team.is_archived.is_(False))
    elif status_filter == "archived":
        base_query = base_query.where(Team.is_archived.is_(True))

    if user_id_filter is not None:
        base_query = base_query.join(Team.members).where(TeamMember.user_id == user_id_filter)

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                Team.name.ilike(term),
                Team.description.ilike(term),
            )
        )

    count_statement = select(func.count()).select_from(base_query.subquery())
    total = db.execute(count_statement).scalar_one()

    items_statement = (
        base_query
        .options(
            selectinload(Team.members).selectinload(TeamMember.user),
        )
    )

    if sort_by == "name":
        items_statement = items_statement.order_by(func.lower(Team.name).asc(), Team.id.asc())
    elif sort_by == "recently_created":
        items_statement = items_statement.order_by(Team.created_at.desc(), Team.id.desc())
    elif sort_by == "most_members":
        member_count_subq = (
            select(func.count(TeamMember.id))
            .where(TeamMember.team_id == Team.id)
            .correlate(Team)
            .scalar_subquery()
        )
        items_statement = items_statement.order_by(member_count_subq.desc(), Team.name.asc(), Team.id.asc())
    else:
        items_statement = items_statement.order_by(Team.created_at.desc(), Team.id.desc())

    items_statement = items_statement.offset((page - 1) * limit).limit(limit)
    items = list(db.execute(items_statement).scalars().all())

    return items, total


def update_team(
    db: Session,
    team: Team,
    name: str | None = None,
    description: str | None = None,
    icon: str | None = None,
    color: str | None = None,
    is_archived: bool | None = None,
) -> Team:
    if name is not None:
        team.name = name.strip()
    if description is not None:
        team.description = description.strip() if description.strip() else None
    if icon is not None:
        team.icon = icon.strip()
    if color is not None:
        team.color = color.strip()
    if is_archived is not None:
        team.is_archived = is_archived

    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def delete_team(
    db: Session,
    team: Team,
) -> None:
    db.delete(team)
    db.commit()


def get_team_member(
    db: Session,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
) -> TeamMember | None:
    statement = (
        select(TeamMember)
        .options(
            joinedload(TeamMember.user),
        )
        .where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
    )
    return db.execute(statement).scalars().first()


def get_team_members(
    db: Session,
    team_id: uuid.UUID,
) -> list[TeamMember]:
    statement = (
        select(TeamMember)
        .options(
            joinedload(TeamMember.user),
        )
        .where(TeamMember.team_id == team_id)
        .order_by(TeamMember.created_at.asc())
    )
    return list(db.execute(statement).scalars().all())


def get_team_members_paginated(
    db: Session,
    team_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    role: TeamRole | None = None,
    search: str | None = None,
) -> tuple[list[TeamMember], int]:
    base_query = (
        select(TeamMember)
        .join(User, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    )

    if role is not None:
        base_query = base_query.where(TeamMember.role == role)

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.where(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.username.ilike(term),
            )
        )

    count_statement = select(func.count()).select_from(base_query.subquery())
    total = db.execute(count_statement).scalar_one()

    items_statement = (
        base_query
        .options(contains_eager(TeamMember.user))
        .order_by(TeamMember.joined_at.asc(), TeamMember.id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = list(db.execute(items_statement).scalars().all())

    return items, total


def count_team_leads(
    db: Session,
    team_id: uuid.UUID,
) -> int:
    statement = (
        select(func.count(TeamMember.id))
        .where(
            TeamMember.team_id == team_id,
            TeamMember.role == TeamRole.LEAD,
        )
    )
    return db.execute(statement).scalar() or 0


def add_team_member(
    db: Session,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    role: TeamRole = TeamRole.MEMBER,
) -> TeamMember:
    team_member = TeamMember(
        team_id=team_id,
        user_id=user_id,
        role=role,
    )
    db.add(team_member)
    db.commit()
    db.refresh(team_member)
    return team_member


def batch_add_team_members(
    db: Session,
    team_id: uuid.UUID,
    user_ids: list[uuid.UUID],
    role: TeamRole = TeamRole.MEMBER,
) -> list[TeamMember]:
    created_members = []
    for uid in user_ids:
        tm = TeamMember(
            team_id=team_id,
            user_id=uid,
            role=role,
        )
        db.add(tm)
        created_members.append(tm)
    db.commit()
    for tm in created_members:
        db.refresh(tm)
    return created_members


def update_team_member_role(
    db: Session,
    team_member: TeamMember,
    role: TeamRole,
) -> TeamMember:
    team_member.role = role
    db.add(team_member)
    db.commit()
    db.refresh(team_member)
    return team_member


def transfer_team_leadership(
    db: Session,
    team_id: uuid.UUID,
    current_lead_member: TeamMember | None,
    new_lead_member: TeamMember,
) -> None:
    if current_lead_member:
        current_lead_member.role = TeamRole.MEMBER
        db.add(current_lead_member)

    new_lead_member.role = TeamRole.LEAD
    db.add(new_lead_member)
    db.commit()
    db.refresh(new_lead_member)
    if current_lead_member:
        db.refresh(current_lead_member)


def remove_team_member(
    db: Session,
    team_member: TeamMember,
) -> None:
    db.delete(team_member)
    db.commit()
