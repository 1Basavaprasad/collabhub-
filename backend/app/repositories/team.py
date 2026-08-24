import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.team import Team
from app.models.team_activity import TeamActivity
from app.models.team_member import TeamMember, TeamRole


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
    limit: int = 50,
) -> list[TeamActivity]:
    statement = (
        select(TeamActivity)
        .options(
            joinedload(TeamActivity.actor),
        )
        .where(TeamActivity.team_id == team_id)
        .order_by(TeamActivity.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(statement).scalars().all())


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


def get_team_by_id(
    db: Session,
    team_id: uuid.UUID,
) -> Team | None:
    statement = (
        select(Team)
        .options(
            joinedload(Team.members).joinedload(TeamMember.user),
        )
        .where(Team.id == team_id)
    )
    return db.execute(statement).unique().scalar_one_or_none()


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
    status_filter: str | None = None,
    user_id_filter: uuid.UUID | None = None,
) -> list[Team]:
    statement = (
        select(Team)
        .options(
            joinedload(Team.members).joinedload(TeamMember.user),
        )
        .where(Team.company_id == company_id)
    )

    if status_filter == "active":
        statement = statement.where(Team.is_archived.is_(False))
    elif status_filter == "archived":
        statement = statement.where(Team.is_archived.is_(True))

    if user_id_filter is not None:
        statement = statement.join(Team.members).where(TeamMember.user_id == user_id_filter)

    statement = statement.order_by(Team.created_at.asc())
    return list(db.execute(statement).unique().scalars().all())


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
