from typing import Optional

# pyrefly: ignore [missing-import]
from pydantic import computed_field

# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "TeamX"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"

    # JWT Authentication Settings
    JWT_SECRET_KEY: str = "default-secret-key-for-development"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # PostgreSQL Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "collabhub"

    # Direct database URL override (optional)
    DATABASE_URL: Optional[str] = None

    # Resend Email Settings (Optional / Legacy)
    EMAIL_API_KEY: Optional[str] = None
    EMAIL_FROM: Optional[str] = None

    # SMTP Email Settings (Gmail / Standard SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "TeamX"

    # Frontend URL for Invitation & Reset Links
    FRONTEND_URL: str = "http://localhost:5173"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL

        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()