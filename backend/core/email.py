from email.message import EmailMessage
import aiosmtplib
from core.config import settings

async def send_email(
    subject: str,
    recipients: list[str],
    body: str,
    attachments: list[dict] = None  # [{"filename": "x.jpg", "content": bytes}]
) -> None:
    host = settings.SMTP_HOST or ("smtp.gmail.com" if settings.EMAIL_ADDRESS else None)
    port = settings.SMTP_PORT if settings.SMTP_HOST else 587
    user = settings.SMTP_USER or settings.EMAIL_ADDRESS
    password = settings.SMTP_PASSWORD or settings.EMAIL_APP_PASSWORD

    # Guard: skip if SMTP is not configured
    if not host:
        print("Email alert skipped: SMTP_HOST not configured.")
        return

    message = EmailMessage()
    message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    message["To"] = recipients
    message["Subject"] = subject
    message.set_content(body)

    if attachments:
        for attachment in attachments:
            if attachment.get("content"):
                message.add_attachment(
                    attachment["content"],
                    maintype="image",
                    subtype="jpeg",
                    filename=attachment["filename"]
                )

    smtp = aiosmtplib.SMTP(
        hostname=host,
        port=port,
        use_tls=port == 465,
        start_tls=port == 587,
    )
    
    try:
        await smtp.connect()
        if user and password:
            await smtp.login(user, password)
        
        await smtp.send_message(message)
    except Exception as e:
        print(f"Failed to send email: {e}")
    finally:
        try:
            await smtp.quit()
        except Exception:
            pass
