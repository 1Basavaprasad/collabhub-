# pyrefly: ignore [missing-import]
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    password: str