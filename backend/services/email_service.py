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
        
        text_body = f"""
CRITICAL THREAT ALERT

Alert Type: {alert_type.capitalize()}
Confidence Score: {confidence:.2%}
Detection Timestamp: {timestamp}

Please review the attached detection frame immediately on the Officer Dashboard.
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-top: 6px solid #dc2626; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
        .header {{ padding: 20px 24px; border-bottom: 1px solid #e5e7eb; background-color: #fef2f2; }}
        .header h1 {{ color: #b91c1c; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }}
        .content {{ padding: 24px; }}
        .message {{ color: #1f2937; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 24px; }}
        
        .data-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
        .data-table th, .data-table td {{ padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }}
        .data-table th {{ background-color: #f9fafb; color: #4b5563; font-weight: 600; width: 40%; }}
        .data-table td {{ color: #111827; font-weight: 500; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }}
        
        .threat-level {{ color: #dc2626; font-weight: bold; text-transform: uppercase; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px; display: inline-block; }}
        
        .action-list {{ background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 16px; margin-bottom: 24px; }}
        .action-list h3 {{ margin: 0 0 12px 0; color: #b45309; font-size: 14px; text-transform: uppercase; }}
        .action-list ul {{ margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.5; }}
        
        .btn-container {{ text-align: center; margin: 32px 0 16px; }}
        .btn {{ display: inline-block; background-color: #dc2626; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; text-transform: uppercase; transition: background-color 0.2s; }}
        .footer {{ background-color: #1f2937; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SECURITY DISPATCH: THREAT DETECTED</h1>
        </div>
        <div class="content">
            <p class="message">Automated surveillance systems have intercepted a critical event requiring immediate assessment. A high-priority entity has been recognized within the monitored perimeter.</p>
            
            <table class="data-table">
                <tr>
                    <th>THREAT CLASSIFICATION</th>
                    <td><span class="threat-level">{alert_type}</span></td>
                </tr>
                <tr>
                    <th>AI CONFIDENCE RATING</th>
                    <td>{confidence:.2%}</td>
                </tr>
                <tr>
                    <th>TIME OF INCIDENT (UTC)</th>
                    <td>{timestamp}</td>
                </tr>
                <tr>
                    <th>MONITORING NODE</th>
                    <td>Sector-Alpha (Camera 01)</td>
                </tr>
            </table>

            <div class="action-list">
                <h3>Required Protocol Actions:</h3>
                <ul>
                    <li>Review the attached evidentiary frame immediately.</li>
                    <li>Access the Command Dashboard to view full threat context.</li>
                    <li>Dispatch field units if visual confirmation is positive.</li>
                </ul>
            </div>
            
            <div class="btn-container">
                <a href="http://localhost:5173/detections" class="btn">Access Command Dashboard</a>
            </div>
        </div>
        <div class="footer">
            Intelligent Poaching Detection & Response System<br>
            CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY
        </div>
    </div>
</body>
</html>
"""

        message = EmailMessage()
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = self.officer_email
        message["Subject"] = f"🚨 {subject}"
        message.set_content(text_body)
        message.add_alternative(html_body, subtype='html')

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
