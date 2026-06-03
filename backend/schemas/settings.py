from pydantic import BaseModel, Field
from typing import Optional

class SystemSettingsUpdate(BaseModel):
    email_alerts: Optional[bool] = None
    strict_mode: Optional[bool] = None
    confidence_threshold: Optional[int] = Field(None, ge=10, le=100)

class SystemSettingsResponse(BaseModel):
    email_alerts: bool
    strict_mode: bool
    confidence_threshold: int
