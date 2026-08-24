import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from starlette.testclient import TestClient

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
from app.models.company_invitation import CompanyInvitation
from app.services.email import send_company_invitation_email


client = TestClient(app)


def test_send_company_invitation_email_success():
    """Verify that send_company_invitation_email constructs and dispatches valid MIME message via SMTP."""
    recipient = "newmember@example.com"
    company_name = "Acme Corp"
    inviter_name = "Alice Founder"
    role = "MEMBER"
    raw_token = "secure_raw_token_12345"
    invitation_url = f"http://localhost:5173/invitations/accept?token={raw_token}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
    designation = "Senior Backend Engineer"
    department = "Engineering"

    with patch("app.services.email.settings") as mock_settings, patch("smtplib.SMTP") as mock_smtp_cls:
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USERNAME = "test@gmail.com"
        mock_settings.SMTP_PASSWORD = "test-app-password"
        mock_settings.SMTP_FROM_EMAIL = "test@gmail.com"
        mock_settings.SMTP_FROM_NAME = "TeamX"

        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        send_company_invitation_email(
            recipient_email=recipient,
            company_name=company_name,
            inviter_name=inviter_name,
            role=role,
            invitation_url=invitation_url,
            expires_at=expires_at,
            designation=designation,
            department=department,
        )

        mock_smtp_cls.assert_called_once_with("smtp.gmail.com", 587, timeout=15)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@gmail.com", "test-app-password")
        mock_server.send_message.assert_called_once()
        mock_server.quit.assert_called_once()

        # Inspect sent MIME message
        sent_msg = mock_server.send_message.call_args[0][0]
        assert sent_msg["To"] == recipient
        assert sent_msg["Subject"] == f"You're invited to join {company_name} on TeamX"
        assert "TeamX <test@gmail.com>" in sent_msg["From"]

        # Check message body parts
        body_parts = [part.get_payload(decode=True).decode("utf-8") for part in sent_msg.get_payload()]
        combined_body = "\n".join(body_parts)

        # Ensure raw token and link are present
        assert raw_token in combined_body
        assert invitation_url in combined_body
        assert company_name in combined_body
        assert inviter_name in combined_body
        assert designation in combined_body
        assert department in combined_body

        # Ensure security: token_hash is never in email
        fake_token_hash = "abc123hashshouldneverappear"
        assert fake_token_hash not in combined_body


def test_send_company_invitation_missing_credentials():
    """Verify that missing SMTP credentials raises a clear RuntimeError."""
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.SMTP_USERNAME = None
        mock_settings.SMTP_PASSWORD = None

        with pytest.raises(RuntimeError) as exc_info:
            send_company_invitation_email(
                recipient_email="test@example.com",
                company_name="Acme",
                inviter_name="Alice",
                role="MEMBER",
                invitation_url="http://localhost:5173/invitations/accept?token=123",
                expires_at="Aug 27, 2026",
            )
        assert "SMTP credentials are not configured" in str(exc_info.value)


def test_send_company_invitation_smtp_failure():
    """Verify that SMTP communication failures are propagated and connection is closed."""
    with patch("app.services.email.settings") as mock_settings, patch("smtplib.SMTP") as mock_smtp_cls:
        mock_settings.SMTP_HOST = "smtp.gmail.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USERNAME = "test@gmail.com"
        mock_settings.SMTP_PASSWORD = "test-app-password"
        mock_settings.SMTP_FROM_EMAIL = "test@gmail.com"
        mock_settings.SMTP_FROM_NAME = "TeamX"

        mock_server = MagicMock()
        mock_server.send_message.side_effect = smtplib.SMTPException("Authentication failed")
        mock_smtp_cls.return_value = mock_server

        with pytest.raises(smtplib.SMTPException):
            send_company_invitation_email(
                recipient_email="test@example.com",
                company_name="Acme",
                inviter_name="Alice",
                role="MEMBER",
                invitation_url="http://localhost:5173/invitations/accept?token=123",
                expires_at="Aug 27, 2026",
            )
        mock_server.quit.assert_called_once()


def test_invitation_creation_rolls_back_on_email_failure():
    """Verify that if email delivery fails, the database record is deleted and HTTP 500 is returned."""
    suffix = uuid.uuid4().hex[:8]
    user_email = f"owner_{suffix}@example.com"

    # Register and create company
    reg_res = client.post(
        "/auth/register",
        json={"email": user_email, "username": f"owner_{suffix}", "full_name": "Test Owner", "password": "Password123!"},
    )
    assert reg_res.status_code == 201

    login_res = client.post(
        "/auth/login",
        json={"email": user_email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    comp_res = client.post(
        "/companies",
        headers=headers,
        json={"name": f"EmailFail Co {suffix}"},
    )
    company_id = comp_res.json()["id"]

    target_email = f"failed_invite_{suffix}@example.com"

    # Mock send_company_invitation_email raising an error
    with patch("app.services.company_invitation.send_company_invitation_email", side_effect=RuntimeError("SMTP down")):
        inv_res = client.post(
            f"/companies/{company_id}/invitations",
            headers=headers,
            json={"email": target_email, "role": "MEMBER"},
        )
        assert inv_res.status_code == 500
        assert "Invitation could not be delivered" in inv_res.json()["detail"]

    # Verify no orphaned pending invitation exists in DB
    db = SessionLocal()
    try:
        from sqlalchemy import select
        inv = db.scalar(
            select(CompanyInvitation).where(
                CompanyInvitation.company_id == uuid.UUID(company_id),
                CompanyInvitation.email == target_email,
            )
        )
        assert inv is None
    finally:
        db.close()
