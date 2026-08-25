import uuid
from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember
from app.models.project_team import ProjectTeam
from app.models.team import Team
from app.models.team_member import TeamMember
from app.models.user import User


def create_project(
    db: Session,
    company_id: uuid.UUID,
    name: str,
    description: str | None = None,
    created_by_user_id: uuid.UUID | None = None,
    icon: str | None = "folder-kanban",
    color: str | None = "indigo",
) -> Project:
    project = Project(
        company_id=company_id,
        name=name.strip(),
        description=description.strip() if description else None,
        created_by=created_by_user_id,
        icon=icon or "folder-kanban",
        color=color or "indigo",
        status=ProjectStatus.ACTIVE,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return (
        db.query(Project)
        .options(
            selectinload(Project.creator),
            selectinload(Project.teams).selectinload(ProjectTeam.team),
            selectinload(Project.direct_members).selectinload(ProjectMember.user),
        )
        .filter(Project.id == project.id)
        .first()
    ) or project


def get_project_by_id(
    db: Session,
    project_id: uuid.UUID,
) -> Project | None:
    return (
        db.query(Project)
        .options(
            selectinload(Project.creator),
            selectinload(Project.teams).selectinload(ProjectTeam.team),
            selectinload(Project.direct_members).selectinload(ProjectMember.user),
        )
        .filter(Project.id == project_id)
        .first()
    )


def get_project_simple(
    db: Session,
    project_id: uuid.UUID,
) -> Project | None:
    return db.query(Project).filter(Project.id == project_id).first()


def get_project_by_company_and_name(
    db: Session,
    company_id: uuid.UUID,
    name: str,
) -> Project | None:
    return (
        db.query(Project)
        .filter(
            Project.company_id == company_id,
            func.lower(Project.name) == func.lower(name.strip()),
        )
        .first()
    )


def get_company_projects(
    db: Session,
    company_id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
    sort_by: str | None = None,
) -> tuple[list[Project], int]:
    query = (
        db.query(Project)
        .options(selectinload(Project.creator))
        .filter(Project.company_id == company_id)
    )

    if status_filter:
        normalized_status = status_filter.strip().lower()
        if normalized_status == "active":
            query = query.filter(Project.status == ProjectStatus.ACTIVE)
        elif normalized_status == "archived":
            query = query.filter(Project.status == ProjectStatus.ARCHIVED)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Project.name.ilike(pattern),
                Project.description.ilike(pattern),
            )
        )

    total = query.count()

    # Sorting
    if sort_by == "name":
        query = query.order_by(Project.name.asc(), Project.id.asc())
    elif sort_by == "recently_updated":
        query = query.order_by(Project.updated_at.desc(), Project.id.desc())
    else:
        # Default sort: recently created
        query = query.order_by(Project.created_at.desc(), Project.id.desc())

    offset = (page - 1) * limit
    projects = query.offset(offset).limit(limit).all()

    return projects, total


def update_project(
    db: Session,
    project: Project,
    name: str | None = None,
    description: str | None = None,
    icon: str | None = None,
    color: str | None = None,
    status: ProjectStatus | None = None,
    archived_at: datetime | None = None,
    clear_archived_at: bool = False,
) -> Project:
    if name is not None:
        project.name = name.strip()
    if description is not None:
        project.description = description.strip() if description else None
    if icon is not None:
        project.icon = icon
    if color is not None:
        project.color = color
    if status is not None:
        project.status = status
    if clear_archived_at:
        project.archived_at = None
    elif archived_at is not None:
        project.archived_at = archived_at

    db.commit()
    return (
        db.query(Project)
        .options(
            selectinload(Project.creator),
            selectinload(Project.teams).selectinload(ProjectTeam.team),
            selectinload(Project.direct_members).selectinload(ProjectMember.user),
        )
        .filter(Project.id == project.id)
        .first()
    ) or project


def delete_project(
    db: Session,
    project: Project,
) -> None:
    db.delete(project)
    db.commit()


# ============================================================================
# Project Teams Operations
# ============================================================================


def list_project_teams(
    db: Session,
    project_id: uuid.UUID,
) -> list[ProjectTeam]:
    return (
        db.query(ProjectTeam)
        .options(selectinload(ProjectTeam.team))
        .filter(ProjectTeam.project_id == project_id)
        .order_by(ProjectTeam.created_at.desc())
        .all()
    )


def get_project_team(
    db: Session,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
) -> ProjectTeam | None:
    return (
        db.query(ProjectTeam)
        .options(selectinload(ProjectTeam.team))
        .filter(
            ProjectTeam.project_id == project_id,
            ProjectTeam.team_id == team_id,
        )
        .first()
    )


def add_project_team(
    db: Session,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
) -> ProjectTeam:
    project_team = ProjectTeam(
        project_id=project_id,
        team_id=team_id,
    )
    db.add(project_team)
    db.commit()
    db.refresh(project_team)
    return (
        db.query(ProjectTeam)
        .options(selectinload(ProjectTeam.team))
        .filter(ProjectTeam.id == project_team.id)
        .first()
    ) or project_team


def remove_project_team(
    db: Session,
    project_id: uuid.UUID,
    team_id: uuid.UUID,
) -> bool:
    project_team = (
        db.query(ProjectTeam)
        .filter(
            ProjectTeam.project_id == project_id,
            ProjectTeam.team_id == team_id,
        )
        .first()
    )
    if not project_team:
        return False
    db.delete(project_team)
    db.commit()
    return True


# ============================================================================
# Project Direct Members Operations
# ============================================================================


def list_project_members(
    db: Session,
    project_id: uuid.UUID,
) -> list[ProjectMember]:
    return (
        db.query(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .filter(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at.desc())
        .all()
    )


def get_project_member(
    db: Session,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProjectMember | None:
    return (
        db.query(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )


def add_project_member(
    db: Session,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ProjectMember:
    project_member = ProjectMember(
        project_id=project_id,
        user_id=user_id,
    )
    db.add(project_member)
    db.commit()
    db.refresh(project_member)
    return (
        db.query(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .filter(ProjectMember.id == project_member.id)
        .first()
    ) or project_member


def remove_project_member(
    db: Session,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    project_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )
    if not project_member:
        return False
    db.delete(project_member)
    db.commit()
    return True


# ============================================================================
# Effective Project Members Query
# ============================================================================


def get_effective_project_members(
    db: Session,
    project_id: uuid.UUID,
) -> list[dict]:
    """
    Computes effective project members:
    Direct project members + Members of teams assigned to the project.
    Removes duplicates and provides membership source info.
    """
    project_members = (
        db.query(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .filter(ProjectMember.project_id == project_id)
        .all()
    )
    project_teams = (
        db.query(ProjectTeam)
        .options(
            selectinload(ProjectTeam.team)
            .selectinload(Team.members)
            .selectinload(TeamMember.user)
        )
        .filter(ProjectTeam.project_id == project_id)
        .all()
    )

    effective_dict: dict[uuid.UUID, dict] = {}

    for pm in project_members:
        if pm.user:
            effective_dict[pm.user.id] = {
                "id": pm.user.id,
                "email": pm.user.email,
                "username": pm.user.username,
                "full_name": pm.user.full_name,
                "source_type": "direct",
                "team_names": [],
            }

    for pt in project_teams:
        team_name = pt.team.name if pt.team else "Team"
        if pt.team and pt.team.members:
            for tm in pt.team.members:
                if tm.user:
                    if tm.user.id in effective_dict:
                        curr = effective_dict[tm.user.id]
                        if curr["source_type"] == "direct":
                            curr["source_type"] = "both"
                        if team_name not in curr["team_names"]:
                            curr["team_names"].append(team_name)
                    else:
                        effective_dict[tm.user.id] = {
                            "id": tm.user.id,
                            "email": tm.user.email,
                            "username": tm.user.username,
                            "full_name": tm.user.full_name,
                            "source_type": "team",
                            "team_names": [team_name],
                        }

    return sorted(
        list(effective_dict.values()),
        key=lambda u: (u["full_name"].lower(), u["username"].lower()),
    )

