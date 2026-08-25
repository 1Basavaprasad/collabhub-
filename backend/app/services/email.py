import logging
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_company_invitation_email(
    recipient_email: str,
    company_name: str,
    inviter_name: str,
    role: str,
    invitation_url: str,
    expires_at: datetime | str,
    designation: Optional[str] = None,
    department: Optional[str] = None,
) -> None:
    """
    Send a professional HTML company invitation email via SMTP (Gmail).

    Includes a plain-text fallback version.
    """
    # Validate SMTP configuration
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_username = settings.SMTP_USERNAME
    smtp_password = settings.SMTP_PASSWORD
    from_email = settings.SMTP_FROM_EMAIL or smtp_username or "noreply@teamx.app"
    from_name = settings.SMTP_FROM_NAME or "TeamX"

    if not smtp_username or not smtp_password:
        raise RuntimeError(
            "SMTP credentials are not configured. Please set SMTP_USERNAME and SMTP_PASSWORD."
        )

    # Format expiration date
    if isinstance(expires_at, datetime):
        expires_display = expires_at.strftime("%b %d, %Y at %H:%M UTC")
    else:
        expires_display = str(expires_at)

    display_designation = designation.strip() if designation and designation.strip() else "Not specified"
    display_department = department.strip() if department and department.strip() else "Not specified"
    display_inviter = inviter_name.strip() if inviter_name and inviter_name.strip() else "A team member"

    subject = f"You're invited to join {company_name} on TeamX"

    # 1. Plain-text version
    text_content = f"""TeamX Workspace Invitation

You're invited to join {company_name}

{display_inviter} has invited you to collaborate with their organization on TeamX.

Your Invitation Details:
• Company: {company_name}
• Role: {role}
• Designation: {display_designation}
• Department: {display_department}
• Expires: {expires_display} (Valid for 72 hours)

Accept your invitation here:
{invitation_url}

If you were not expecting this invitation, you can safely ignore this email.

—
The TeamX Team
"""

    # 2. HTML version (Client-friendly email template)
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" max-width="540px" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #1e293b;">
                            <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; width: 40px; height: 40px; line-height: 40px; border-radius: 10px; font-weight: bold; font-size: 18px; margin-bottom: 12px;">
                                T
                            </div>
                            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                                Team<span style="color: #818cf8;">X</span>
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #ffffff;">
                                You're invited to join <span style="color: #818cf8;">{company_name}</span>
                            </h2>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                                <strong style="color: #e2e8f0;">{display_inviter}</strong> has invited you to collaborate with their organization on TeamX.
                            </p>

                            <!-- Details Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090d16; border: 1px solid #1e293b; border-radius: 12px; margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; width: 110px;">Company</td>
                                                <td style="padding: 6px 0; font-size: 13px; color: #f1f5f9; font-weight: 600;">{company_name}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Role</td>
                                                <td style="padding: 6px 0; font-size: 13px; color: #818cf8; font-weight: 600;">{role}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Designation</td>
                                                <td style="padding: 6px 0; font-size: 13px; color: #cbd5e1;">{display_designation}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Department</td>
                                                <td style="padding: 6px 0; font-size: 13px; color: #cbd5e1;">{display_department}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Expires</td>
                                                <td style="padding: 6px 0; font-size: 12px; color: #94a3b8; font-family: monospace;">{expires_display}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <a href="{invitation_url}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);">
                                            Accept Invitation &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                                This invitation is valid for 72 hours.<br>
                                If you were not expecting this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 32px; background-color: #0b0f19; border-top: 1px solid #1e293b; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #475569;">
                                &copy; TeamX SaaS Platform &bull; Secure Multi-Tenant Collaboration
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    # Build MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Connect to SMTP server with timeout
    server = None
    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
    except Exception as e:
        logger.error(f"Failed to send company invitation email to {recipient_email}: {e}")
        raise
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


def send_password_reset_email(
    email: str,
    reset_link: str,
) -> None:
    """
    Send password reset email via Resend if API key is configured,
    or via SMTP fallback.
    """
    if settings.EMAIL_API_KEY:
        try:
            import resend

            resend.api_key = settings.EMAIL_API_KEY
            params: resend.Emails.SendParams = {
                "from": settings.EMAIL_FROM or "onboarding@resend.dev",
                "to": [email],
                "subject": "Reset your TeamX password",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #111827;">Reset your TeamX password</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your TeamX password.</p>
                    <p>Click the button below to create a new password:</p>
                    <div style="margin: 30px 0;">
                        <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    <p>This link expires in <strong>15 minutes</strong>.</p>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <p>Regards,<br><strong>TeamX Team</strong></p>
                </div>
                """,
            }
            resend.Emails.send(params)
            return
        except Exception as e:
            logger.warning(f"Resend password reset email failed: {e}")

    # Fallback to SMTP if SMTP is configured
    if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        from_name = settings.SMTP_FROM_NAME or "TeamX"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your TeamX password"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = email

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #111827;">Reset your TeamX password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your TeamX password.</p>
            <div style="margin: 30px 0;">
                <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Reset Password
                </a>
            </div>
            <p>This link expires in 15 minutes.</p>
            <p>Regards,<br><strong>TeamX Team</strong></p>
        </div>
        """
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        server = None
        try:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {e}")
            raise
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass