import uuid
from unittest.mock import patch
# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    assert res.json()["service"] == "collabhub-api"


def test_register_and_login():
    unique_suffix = uuid.uuid4().hex[:8]
    email = f"user_{unique_suffix}@example.com"
    username = f"user_{unique_suffix}"
    password = "StrongPassword123!"

    # 1. Register
    reg_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": "Test User",
            "password": password,
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["email"] == email
    assert reg_data["username"] == username
    assert "id" in reg_data
    assert "password" not in reg_data

    # 2. Duplicate registration (same email)
    dup_res = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": f"other_{unique_suffix}",
            "full_name": "Duplicate User",
            "password": password,
        },
    )
    assert dup_res.status_code == 409
    assert "Email already registered" in dup_res.json()["detail"]

    # 3. Duplicate registration (same username)
    dup_uname_res = client.post(
        "/auth/register",
        json={
            "email": f"other_{unique_suffix}@example.com",
            "username": username,
            "full_name": "Duplicate User",
            "password": password,
        },
    )
    assert dup_uname_res.status_code == 409
    assert "Username already taken" in dup_uname_res.json()["detail"]

    # 4. Weak password validation
    weak_res = client.post(
        "/auth/register",
        json={
            "email": f"weak_{unique_suffix}@example.com",
            "username": f"weak_{unique_suffix}",
            "full_name": "Weak User",
            "password": "123",
        },
    )
    assert weak_res.status_code == 422

    # 5. Login valid credentials
    login_res = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    token = login_data["access_token"]

    # 6. Login invalid credentials
    bad_login = client.post(
        "/auth/login",
        json={"email": email, "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401
    assert "Invalid email or password" in bad_login.json()["detail"]

    # 7. GET /auth/me authenticated
    me_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["id"] == reg_data["id"]
    assert me_res.json()["email"] == email
    assert me_res.json()["username"] == username
    assert me_res.json()["full_name"] == "Test User"


def test_auth_me_unauthenticated():
    res = client.get("/auth/me")
    assert res.status_code in (401, 403)


from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

@patch("app.services.auth.send_password_reset_email")
def test_forgot_password_existing_email_does_not_expose_token(mock_send_email):
    """TEST 1: Existing email returns generic success response without exposing reset_token."""
    mock_send_email.return_value = {"id": "mock-email-id"}

    unique_suffix = uuid.uuid4().hex[:8]
    email = f"pwd_safe_{unique_suffix}@example.com"
    username = f"pwd_safe_{unique_suffix}"
    password = "InitialPassword123!"

    # 1. Register user
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": "Password Reset User",
            "password": password,
        },
    )
    assert reg.status_code == 201

    # 2. Forgot password request
    forgot = client.post(
        "/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 200
    forgot_data = forgot.json()

    # Verify generic message and token absence
    assert forgot_data == {
        "message": "If an account exists for this email, a password reset link has been sent."
    }
    assert "reset_token" not in forgot_data
    assert "token" not in forgot_data
    assert "raw_token" not in forgot_data


@patch("app.services.auth.send_password_reset_email")
def test_forgot_password_non_existing_email_returns_identical_generic_response(mock_send_email):
    """TEST 2: Non-existing email returns identical generic response with no user enumeration."""
    non_existing_email = f"nonexistent_{uuid.uuid4().hex[:8]}@example.com"

    forgot = client.post(
        "/auth/forgot-password",
        json={"email": non_existing_email},
    )
    assert forgot.status_code == 200
    forgot_data = forgot.json()

    # Must return the exact same generic message with no user enumeration
    assert forgot_data == {
        "message": "If an account exists for this email, a password reset link has been sent."
    }
    assert "reset_token" not in forgot_data
    assert not mock_send_email.called


@patch("app.services.auth.send_password_reset_email")
def test_forgot_password_dispatches_email_internally_with_secure_token(mock_send_email):
    """TEST 3: Email service is called internally with the secure reset link containing the raw token."""
    mock_send_email.return_value = {"id": "mock-email-id"}

    unique_suffix = uuid.uuid4().hex[:8]
    email = f"pwd_email_{unique_suffix}@example.com"
    username = f"pwd_email_{unique_suffix}"
    password = "InitialPassword123!"

    # 1. Register user
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": "Email Token User",
            "password": password,
        },
    )
    assert reg.status_code == 201

    # 2. Forgot password request
    forgot = client.post(
        "/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 200
    assert "reset_token" not in forgot.json()

    # 3. Verify internal email dispatch
    assert mock_send_email.called
    call_kwargs = mock_send_email.call_args.kwargs
    assert call_kwargs["email"] == email
    assert "reset_link" in call_kwargs

    # Verify link format
    reset_link = call_kwargs["reset_link"]
    parsed = urlparse(reset_link)
    query_params = parse_qs(parsed.query)
    assert "token" in query_params
    raw_token = query_params["token"][0]
    assert len(raw_token) >= 32


@patch("app.services.auth.send_password_reset_email")
def test_reset_password_lifecycle_and_validation(mock_send_email):
    """TEST 4: Password reset lifecycle works with valid tokens and rejects invalid/expired/used tokens."""
    from app.core.database import SessionLocal
    from app.core.security import generate_password_reset_token, hash_reset_token
    from app.repositories.password_reset import create_password_reset_token

    mock_send_email.return_value = {"id": "mock-email-id"}

    unique_suffix = uuid.uuid4().hex[:8]
    email = f"pwd_reset_{unique_suffix}@example.com"
    username = f"pwd_reset_{unique_suffix}"
    initial_password = "InitialPassword123!"

    # 1. Register user
    reg = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "full_name": "Password Reset User",
            "password": initial_password,
        },
    )
    assert reg.status_code == 201
    user_id = uuid.UUID(reg.json()["id"])

    # 2. Request forgot-password
    forgot = client.post(
        "/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 200
    assert "reset_token" not in forgot.json()

    # Extract raw token from mocked internal email invocation
    call_kwargs = mock_send_email.call_args.kwargs
    reset_link = call_kwargs["reset_link"]
    raw_token = parse_qs(urlparse(reset_link).query)["token"][0]

    # 3. Invalid token rejection
    invalid_reset = client.post(
        "/auth/reset-password",
        json={"token": "invalid_nonexistent_token_12345", "new_password": "NewValidPassword123!"},
    )
    assert invalid_reset.status_code == 400
    assert "Invalid or expired password reset token" in invalid_reset.json()["detail"]

    # 4. Expired token rejection
    expired_raw_token = generate_password_reset_token()
    expired_token_hash = hash_reset_token(expired_raw_token)
    db = SessionLocal()
    try:
        create_password_reset_token(
            db=db,
            user_id=user_id,
            token_hash=expired_token_hash,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
    finally:
        db.close()

    expired_reset = client.post(
        "/auth/reset-password",
        json={"token": expired_raw_token, "new_password": "NewValidPassword123!"},
    )
    assert expired_reset.status_code == 400
    assert "Invalid or expired password reset token" in expired_reset.json()["detail"]

    # 5. Successful reset with valid token
    new_password = "BrandNewSecurePassword456!"
    reset = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": new_password},
    )
    assert reset.status_code == 200
    assert reset.json()["message"] == "Password reset successfully"

    # 6. Old password must fail
    old_login = client.post(
        "/auth/login",
        json={"email": email, "password": initial_password},
    )
    assert old_login.status_code == 401

    # 7. New password must succeed
    new_login = client.post(
        "/auth/login",
        json={"email": email, "password": new_password},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()

    # 8. Used token cannot be reused
    reused_reset = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": "AnotherPassword789!"},
    )
    assert reused_reset.status_code == 400
    assert "Invalid or expired password reset token" in reused_reset.json()["detail"]
