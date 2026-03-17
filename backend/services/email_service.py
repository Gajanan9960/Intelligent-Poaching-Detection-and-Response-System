import os
import aiosmtplib
from email.message import EmailMessage
import asyncio
from datetime import datetime

from core.config import settings

class EmailService:
    def __init__(self):
        self.email_address = settings.EMAIL_ADDRESS
        self.email_password = settings.EMAIL_APP_PASSWORD
        self.officer_email = settings.OFFICER_EMAIL
        self.from_email = settings.EMAILS_FROM_EMAIL
        self.from_name = settings.EMAILS_FROM_NAME

    async def _send_email_async(self, alert_type: str, confidence: float, image_path: str):
        if not self.email_address or not self.email_password or not self.officer_email:
            print("Email alert skipped: SMTP credentials or OFFICER_EMAIL not configured.")
            return

        subject = f"{alert_type.capitalize()} Alert Detected"
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        body = f"""
CRITICAL THREAT ALERT

Alert Type: {alert_type.capitalize()}
Confidence Score: {confidence:.2%}
Detection Timestamp: {timestamp}

Please review the attached detection frame immediately on the Officer Dashboard.
        """

        message = EmailMessage()
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = self.officer_email
        message["Subject"] = subject
        message.set_content(body)

        if image_path and os.path.exists(image_path):
            with open(image_path, "rb") as img:
                img_data = img.read()
            message.add_attachment(
                img_data,
                maintype="image",
                subtype="jpeg",
                filename=os.path.basename(image_path)
            )

        smtp = aiosmtplib.SMTP(
            hostname="smtp.gmail.com",
            port=587,
            use_tls=False,
            start_tls=True,
        )
        
        try:
            await smtp.connect()
            await smtp.login(self.email_address, self.email_password)
            await smtp.send_message(message)
            print(f"Alert email sent to {self.officer_email} for {alert_type}")
        except Exception as e:
            print(f"Failed to send alert email: {e}")
        finally:
            try:
                await smtp.quit()
            except Exception:
                pass


    def send_alert_email_background(self, alert_type: str, confidence: float, image_path: str):
        """Fire and forget wrapper to trigger the async email sending without blocking."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._send_email_async(alert_type, confidence, image_path))
        except RuntimeError:
            # If no loop is running, run it directly (shouldn't happen in fastapi but safe fallback)
            asyncio.run(self._send_email_async(alert_type, confidence, image_path))
