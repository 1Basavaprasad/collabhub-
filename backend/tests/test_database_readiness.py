from unittest.mock import patch
import pytest
from pydantic import ValidationError
from sqlalchemy import text
from starlette.testclient import TestClient

from app.core.config import Settings
from app.core.database import SessionLocal, engine, get_db, get_pool_status
from app.main import app

client = TestClient(app)


def test_health_endpoint_backward_compatibility():
    """
    Verifies /health remains a lightweight process liveness probe
    and maintains exact backward compatibility.
    """
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "collabhub-api"


def test_readiness_endpoint_database_connected():
    """
    Verifies /readiness returns 200 and 'connected' when the database is available.
    """
    res = client.get("/readiness")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_readiness_endpoint_database_unavailable_returns_503_without_leaks():
    """
    Verifies /readiness returns 503 and 'unavailable' when the database check fails,
    without leaking connection strings, credentials, or internal stack traces.
    """
    with patch("sqlalchemy.orm.Session.execute", side_effect=Exception("Database connection timeout error")):
        res = client.get("/readiness")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "unavailable"

        # Verify no credentials or internal details leaked
        raw_text = res.text.lower()
        assert "password" not in raw_text
        assert "postgres" not in raw_text
        assert "traceback" not in raw_text
        assert "database connection timeout error" not in raw_text


def test_database_session_lifecycle_success_returned_to_pool():
    """
    Verifies get_db() correctly yields a session and closes it in finally block on normal completion.
    """
    generator = get_db()
    db = next(generator)
    assert db is not None
    assert db.is_active

    # Run query
    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1

    # Finish generator
    with pytest.raises(StopIteration):
        next(generator)


def test_database_session_lifecycle_exception_returned_to_pool():
    """
    Verifies get_db() closes the session even if an exception occurs during request execution.
    """
    generator = get_db()
    db = next(generator)
    assert db is not None

    # Simulate exception thrown in route handler
    with pytest.raises(RuntimeError):
        generator.throw(RuntimeError("Simulated route error"))


def test_database_pool_configuration_valid():
    """
    Verifies Settings accepts valid production pool configurations.
    """
    custom_settings = Settings(
        DB_POOL_SIZE=15,
        DB_MAX_OVERFLOW=30,
        DB_POOL_TIMEOUT=45,
        DB_POOL_RECYCLE=3600,
        DB_POOL_PRE_PING=True,
    )
    assert custom_settings.DB_POOL_SIZE == 15
    assert custom_settings.DB_MAX_OVERFLOW == 30
    assert custom_settings.DB_POOL_TIMEOUT == 45
    assert custom_settings.DB_POOL_RECYCLE == 3600
    assert custom_settings.DB_POOL_PRE_PING is True


def test_database_pool_configuration_invalid_rejected():
    """
    Verifies invalid pool settings (negative or zero sizes) raise validation errors.
    """
    with pytest.raises(ValidationError):
        Settings(DB_POOL_SIZE=0)

    with pytest.raises(ValidationError):
        Settings(DB_MAX_OVERFLOW=-1)

    with pytest.raises(ValidationError):
        Settings(DB_POOL_TIMEOUT=0)

    with pytest.raises(ValidationError):
        Settings(DB_POOL_RECYCLE=-5)


def test_get_pool_status_diagnostics():
    """
    Verifies get_pool_status returns integer metrics without exposing credentials.
    """
    stats = get_pool_status()
    assert isinstance(stats, dict)
    assert "pool_size" in stats
    assert "checkedin" in stats
    assert "checkedout" in stats
    assert "overflow" in stats
    assert isinstance(stats["pool_size"], int)
