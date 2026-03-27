from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from api import deps
from db.mongodb import get_database
from schemas.detection import Detection
from schemas.user import User

router = APIRouter()

@router.get("/", response_model=List[Detection])
async def read_detections(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve detections. Allowed for all authenticated users.
    """
    db = get_database()
    # Officers/admins see all detections; rangers only see their own
    if current_user.role in ("admin", "officer"):
        query = {}
    else:
        user_videos = await db.videos.find(
            {"user_id": current_user.id}, {"_id": 1}
        ).to_list(length=None)
        video_ids = [v["_id"] for v in user_videos]
        query = {"video_id": {"$in": video_ids}}
    cursor = db.detections.find(query).sort("detected_at", -1).skip(skip).limit(limit)
    detections = await cursor.to_list(length=limit)
    return [Detection(**d, id=str(d["_id"])) for d in detections]
