from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, get_db
from app.routers.auth import router as auth_router
from app.routers.company import router as company_router
from app.routers.team import router as team_router

# In production, documentation endpoints can be conditionally disabled unless explicitly allowed
is_prod = settings.ENVIRONMENT.lower() == "production"
docs_enabled = settings.DEBUG or not is_prod


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Application startup
    yield
    # Application shutdown: gracefully dispose database connection pool
    engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if docs_enabled else None,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    lifespan=lifespan,
)

# Explicit Production CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

app.include_router(auth_router)
app.include_router(company_router)
app.include_router(team_router)


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """
    Liveness probe: verifies the API process is alive and responsive.
    Independent of external infrastructure dependencies.
    """
    return {
        "status": "healthy",
        "service": "collabhub-api",
    }


@app.get("/readiness", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)) -> JSONResponse:
    """
    Readiness probe: verifies the application and database connectivity are ready to accept traffic.
    Never exposes internal credentials, connection strings, or stack traces on failure.
    """
    try:
        db.execute(text("SELECT 1"))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "ready",
                "database": "connected",
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "unavailable",
            },
        )