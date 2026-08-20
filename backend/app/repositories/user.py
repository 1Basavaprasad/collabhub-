# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session 
# pyrefly: ignore [missing-import]
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)

    return db.execute(statement).scalar_one_or_none()


def get_user_by_username(db: Session, username: str) -> User | None:
    statement = select(User).where(User.username == username)

    return db.execute(statement).scalar_one_or_none()

def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()




def create_user(
    db: Session,
    email: str,
    username: str,
    full_name: str,
    password_hash: str,
) -> User:
    user = User(
        email=email,
        username=username,
        full_name=full_name,
        password_hash=password_hash,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user