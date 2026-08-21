import resend

from app.core.config import settings


def send_password_reset_email(
    email: str,
    reset_link: str,
) -> None:
    resend.api_key = settings.EMAIL_API_KEY

    params: resend.Emails.SendParams = {
        "from": settings.EMAIL_FROM,
        "to": [email],
        "subject": "Reset your CollabHub password",
        "html": f"""
        <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
        ">
            <h2 style="color: #111827;">
                Reset your CollabHub password
            </h2>

            <p>Hello,</p>

            <p>
                We received a request to reset your CollabHub password.
            </p>

            <p>
                Click the button below to create a new password:
            </p>

            <div style="margin: 30px 0;">
                <a
                    href="{reset_link}"
                    style="
                        display: inline-block;
                        padding: 12px 24px;
                        background: #7c3aed;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                    "
                >
                    Reset Password
                </a>
            </div>

            <p>
                This password reset link will expire in
                <strong>15 minutes</strong>.
            </p>

            <p>
                If you did not request this password reset,
                you can safely ignore this email.
            </p>

            <p>
                Regards,<br>
                <strong>CollabHub Team</strong>
            </p>
        </div>
        """,
    }

    response = resend.Emails.send(params)

    print(
        f"Password reset email sent successfully: {response}",
        flush=True,
    )