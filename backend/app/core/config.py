from typing import Any, Optional

from pydantic import computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_SECRETS: set[str] = {
    "YOUR_NEW_JWT_SECRET",
    "change-me",
    "secret",
    "secret-key",
    "development-secret",
    "default-secret-key-for-development",
    "your-secret-key-here",
    "your-256-bit-secret-key-here",
}


class Settings(BaseSettings):
    PROJECT_NAME: str = "TeamX"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # JWT Authentication Settings (Minimum 32 characters / 256 bits for SHA256)
    JWT_SECRET_KEY: str = "collabhub-dev-secret-key-that-is-at-least-32-chars-long-for-teamx-auth"
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

    # CORS Configuration
    CORS_ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = False
    CORS_ALLOW_METHODS: list[str] = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ]
    CORS_ALLOW_HEADERS: list[str] = [
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
        "X-Forwarded-For",
        "X-Real-IP",
    ]

    # Rate Limiting Configuration
    RATE_LIMITING_ENABLED: bool = True
    TRUSTED_PROXIES: list[str] = ["127.0.0.1", "::1", "localhost", "testclient"]

    # Public Auth & Verification Rate Limits (requests per window)
    RATE_LIMIT_LOGIN_MAX_REQUESTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60  # 5 attempts / minute

    RATE_LIMIT_REGISTER_MAX_REQUESTS: int = 5
    RATE_LIMIT_REGISTER_WINDOW_SECONDS: int = 3600  # 5 registrations / hour

    RATE_LIMIT_FORGOT_PASSWORD_MAX_REQUESTS: int = 3
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS: int = 3600  # 3 requests / hour

    RATE_LIMIT_RESET_PASSWORD_MAX_REQUESTS: int = 5
    RATE_LIMIT_RESET_PASSWORD_WINDOW_SECONDS: int = 3600  # 5 attempts / hour

    RATE_LIMIT_INVITATION_VERIFY_MAX_REQUESTS: int = 20
    RATE_LIMIT_INVITATION_VERIFY_WINDOW_SECONDS: int = 60  # 20 verifications / minute

    @field_validator("CORS_ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, (list, tuple)):
            return list(v)
        return []

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        is_prod = self.ENVIRONMENT.lower() == "production"

        if is_prod:
            # 1. Reject known insecure / default placeholders in production
            if self.JWT_SECRET_KEY in INSECURE_JWT_SECRETS:
                raise ValueError("JWT_SECRET_KEY cannot use default/insecure placeholder values in production.")

            # 2. Reject missing or weak JWT secret in production
            if not self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("JWT_SECRET_KEY must be at least 32 characters in production.")

            # 3. Reject DEBUG=True in production
            if self.DEBUG:
                raise ValueError("DEBUG mode must be disabled in production.")

        return self

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