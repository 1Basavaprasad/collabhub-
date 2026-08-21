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


@patch("app.services.auth.send_password_reset_email")
def test_forgot_and_reset_password_flow(mock_send_email):
    mock_send_email.return_value = {"id": "mock-email-id"}

    unique_suffix = uuid.uuid4().hex[:8]
    email = f"pwd_{unique_suffix}@example.com"
    username = f"pwd_{unique_suffix}"
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

    # 2. Forgot password request
    forgot = client.post(
        "/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 200
    forgot_data = forgot.json()
    assert "reset_token" in forgot_data
    reset_token = forgot_data["reset_token"]
    assert mock_send_email.called

    # 3. Reset password with new password
    new_password = "BrandNewSecurePassword456!"
    reset = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "new_password": new_password},
    )
    assert reset.status_code == 200
    assert reset.json()["message"] == "Password reset successfully"

    # 4. Old password must fail
    old_login = client.post(
        "/auth/login",
        json={"email": email, "password": initial_password},
    )
    assert old_login.status_code == 401

    # 5. New password must succeed
    new_login = client.post(
        "/auth/login",
        json={"email": email, "password": new_password},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()

    # 6. Used token cannot be reused
    reused_reset = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "new_password": "AnotherPassword789!"},
    )
    assert reused_reset.status_code == 400
    assert "Invalid or expired password reset token" in reused_reset.json()["detail"]
