import pytest
from starlette.testclient import TestClient

from app.core.config import Settings
from app.core.security import create_access_token, decode_access_token
from app.main import app

client = TestClient(app)


def test_jwt_validation_strong_secret_accepted_in_production():
    """
    TEST 1: Valid strong JWT secret (>= 32 characters and non-default) is accepted in production.
    """
    strong_secret = "a-very-strong-production-secret-key-that-is-at-least-32-chars-long"
    settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET_KEY=strong_secret,
        DEBUG=False,
    )
    assert settings.JWT_SECRET_KEY == strong_secret
    assert settings.ENVIRONMENT == "production"


def test_jwt_validation_short_secret_rejected_in_production():
    """
    TEST 2: JWT secret shorter than 32 characters is rejected in production with clear error.
    """
    with pytest.raises(ValueError, match="JWT_SECRET_KEY must be at least 32 characters in production"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="short-secret-19bytes",
            DEBUG=False,
        )


def test_jwt_validation_missing_secret_rejected_in_production():
    """
    TEST 3: Empty/missing JWT secret is rejected in production.
    """
    with pytest.raises(ValueError, match="JWT_SECRET_KEY must be at least 32 characters in production"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="",
            DEBUG=False,
        )


def test_jwt_validation_insecure_default_secret_rejected_in_production():
    """
    TEST 4: Known insecure / default placeholder secrets are rejected in production.
    """
    insecure_defaults = [
        "YOUR_NEW_JWT_SECRET",
        "change-me",
        "secret",
        "secret-key",
        "development-secret",
        "default-secret-key-for-development",
        "your-secret-key-here",
    ]
    for bad_secret in insecure_defaults:
        with pytest.raises(
            ValueError,
            match="JWT_SECRET_KEY cannot use default/insecure placeholder values in production",
        ):
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET_KEY=bad_secret,
                DEBUG=False,
            )


def test_debug_mode_rejected_in_production():
    """
    Production startup validation: DEBUG=True must be rejected in production.
    """
    with pytest.raises(ValueError, match="DEBUG mode must be disabled in production"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="a-very-strong-production-secret-key-that-is-at-least-32-chars-long",
            DEBUG=True,
        )


def test_jwt_generation_and_decoding_functional():
    """
    TEST 6: JWT creation and verification work properly with secure key.
    """
    test_user_id = "12345678-1234-5678-1234-567812345678"
    token = create_access_token(user_id=test_user_id)
    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_access_token(token)
    assert payload["sub"] == test_user_id
    assert "exp" in payload


def test_cors_allowed_origin_receives_access_control_headers():
    """
    TEST 7: Requests from configured allowed origin receive CORS headers.
    """
    allowed_origin = "http://localhost:5173"
    res = client.get(
        "/health",
        headers={"Origin": allowed_origin},
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == allowed_origin


def test_cors_disallowed_origin_rejected():
    """
    TEST 8: Requests from disallowed origins do NOT receive access-control-allow-origin header.
    """
    disallowed_origin = "http://malicious-attacker-site.com"
    res = client.get(
        "/health",
        headers={"Origin": disallowed_origin},
    )
    assert res.status_code == 200
    assert "access-control-allow-origin" not in res.headers


def test_cors_preflight_options_request_and_headers():
    """
    TEST 9 & TEST 10: Preflight OPTIONS request from allowed origin returns allowed methods and headers.
    """
    allowed_origin = "http://localhost:5173"
    res = client.options(
        "/auth/login",
        headers={
            "Origin": allowed_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == allowed_origin
    allowed_methods = res.headers.get("access-control-allow-methods", "")
    assert "POST" in allowed_methods
    allowed_headers = res.headers.get("access-control-allow-headers", "")
    assert "authorization" in allowed_headers.lower() or "Authorization" in allowed_headers
    assert "content-type" in allowed_headers.lower() or "Content-Type" in allowed_headers


def test_cors_credentials_configuration():
    """
    TEST 11: Credentials header is not set to true for wildcard or cookie-less JWT auth.
    """
    allowed_origin = "http://localhost:5173"
    res = client.get(
        "/health",
        headers={"Origin": allowed_origin},
    )
    assert res.status_code == 200
    # allow_credentials is False because TeamX uses Authorization Bearer headers rather than cookies
    assert res.headers.get("access-control-allow-credentials") is None
