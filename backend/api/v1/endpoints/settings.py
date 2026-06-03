from fastapi import APIRouter, Depends
from db.mongodb import get_database
from schemas.settings import SystemSettingsResponse, SystemSettingsUpdate
from api import deps
from schemas.user import User

router = APIRouter()

DEFAULT_SETTINGS = {
    "_id": "global_settings",
    "email_alerts": True,
    "strict_mode": False,
    "confidence_threshold": 65
}

@router.get("/", response_model=SystemSettingsResponse)
async def get_settings(
    current_user: User = Depends(deps.RoleChecker(["admin"]))
):
    db = get_database()
    settings = await db.settings.find_one({"_id": "global_settings"})
    
    if not settings:
        await db.settings.insert_one(DEFAULT_SETTINGS.copy())
        return DEFAULT_SETTINGS
        
    return settings

@router.put("/", response_model=SystemSettingsResponse)
async def update_settings(
    settings_update: SystemSettingsUpdate,
    current_user: User = Depends(deps.RoleChecker(["admin"]))
):
    db = get_database()
    
    # Ensure document exists
    settings = await db.settings.find_one({"_id": "global_settings"})
    if not settings:
        await db.settings.insert_one(DEFAULT_SETTINGS.copy())
    
    update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
    
    if update_data:
        await db.settings.update_one(
            {"_id": "global_settings"},
            {"$set": update_data}
        )
        
    updated_settings = await db.settings.find_one({"_id": "global_settings"})
    return updated_settings
