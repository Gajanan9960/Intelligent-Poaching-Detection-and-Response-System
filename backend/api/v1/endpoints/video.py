import os
import cv2
import asyncio
import aiofiles
from typing import List
from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from backend.api import deps
from backend.schemas.user import User
from backend.schemas.video import Video, VideoStatus
from backend.db.mongodb import get_database
from backend.core.config import settings

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"}
MAX_UPLOAD_SIZE_MB = 50

# Lazy-load detector to avoid blocking startup if model isn't available
_detector = None

def get_detector():
    global _detector
    if _detector is None:
        try:
            from model.detector import PoachingDetector
            _detector = PoachingDetector()
        except Exception as e:
            print(f"Warning: Could not load detection model: {e}")
            _detector = None
    return _detector


async def process_image_task(video_id: str, file_path: str, user_email: str):
    db = get_database()
    await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.processing}})
    
    detector = get_detector()
    if detector is None:
        print(f"Skipping detection for {video_id}: model not loaded")
        await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.failed}})
        return

    loop = asyncio.get_running_loop()
    
    def run_detection_sync():
        detections_found = []
        frame = cv2.imread(file_path)
        if frame is None:
            print(f"Could not read image: {file_path}")
            return detections_found
        
        results = detector.model(frame, verbose=False)
        for r in results:
            for box in r.boxes:
                c = int(box.cls)
                label = detector.model.names[c]
                conf = float(box.conf)
                
                # Use the detector's classify_detection method
                detected_class = detector.classify_detection(c, label)
                
                if detected_class:
                    timestamp = datetime.now()
                    # Save annotated frame for all detections
                    frame_filename = f"{uuid4()}.jpg"
                    img_dir = os.path.join("backend", "static", "images")
                    os.makedirs(img_dir, exist_ok=True)
                    img_path = os.path.join(img_dir, frame_filename)
                    cv2.imwrite(img_path, frame)
                    image_url = f"/static/images/{frame_filename}"
                    
                    detections_found.append({
                        "video_id": video_id,
                        "timestamp": timestamp,
                        "detected_class": detected_class,
                        "confidence": conf,
                        "image_url": image_url
                    })
        return detections_found

    try:
        detections = await loop.run_in_executor(None, run_detection_sync)

        # Save detections to DB
        if detections:
            await db.detections.insert_many(detections)
            
            # Check if we need to send alerts
            alerts = [d for d in detections if str(d.get("detected_class", "")).lower() in ["poacher", "weapon"]]
            if alerts:
                try:
                    from backend.core.email import send_email
                    first_alert = alerts[0]
                    image_content = None
                    if first_alert.get("image_url"):
                        path = os.path.join("backend", "static", "images", os.path.basename(first_alert["image_url"]))
                        if os.path.exists(path):
                            async with aiofiles.open(path, "rb") as f:
                                image_content = await f.read()
                    
                    await send_email(
                        subject=f"ALERT: {first_alert['detected_class']} Detected!",
                        recipients=[user_email],
                        body=f"Detected {len(alerts)} critical instances. First detected {first_alert['detected_class']} with {first_alert['confidence']:.2f} confidence.",
                        attachments=[{"filename": "alert.jpg", "content": image_content}] if image_content else []
                    )
                except Exception as e:
                    print(f"Email alert failed (non-fatal): {e}")

        await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.completed}})
    except Exception as e:
        print(f"Image processing failed for {video_id}: {e}")
        await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.failed}})


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(deps.get_current_user)
):
    # ─── Validate file type ─────────────────────────────
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPG, PNG, WebP, BMP, TIFF."
        )

    video_id = str(uuid4())
    # Sanitize filename — strip directory components and dangerous characters
    raw_name = os.path.basename(file.filename or "upload.jpg")
    secure_name = "".join(c for c in raw_name if c.isalnum() or c in "._-").strip()
    if not secure_name:
        secure_name = "upload.jpg"
    
    # Ensure upload directory exists
    upload_dir = os.path.join("backend", "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_location = os.path.join(upload_dir, f"{video_id}_{secure_name}")
    
    # ─── Stream file to disk with size check ────────────
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_written = 0
    try:
        async with aiofiles.open(file_location, 'wb') as out_file:
            while content := await file.read(1024 * 1024):
                total_written += len(content)
                if total_written > max_bytes:
                    # Clean up oversized file
                    await out_file.close()
                    os.remove(file_location)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE_MB}MB."
                    )
                await out_file.write(content)
    except HTTPException:
        raise
    except Exception as e:
        # Clean up on write failure
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")
    
    db = get_database()
    image_url = f"/static/uploads/{video_id}_{secure_name}"
    video_doc = {
        "_id": video_id,
        "filename": file.filename,
        "user_id": current_user.id,
        "uploaded_at": datetime.now(),
        "status": VideoStatus.pending,
        "file_path": file_location,
        "image_url": image_url
    }
    
    try:
        await db.videos.insert_one(video_doc)
    except Exception as e:
        # Clean up file if DB insert fails
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail="Failed to register upload in database.")
    
    background_tasks.add_task(process_image_task, video_id, file_location, current_user.email)
    
    return {"id": video_id, "status": "pending", "message": "Image uploaded and analysis started"}

@router.get("/list")
async def list_videos(
    current_user: User = Depends(deps.get_current_user)
):
    db = get_database()
    
    pipeline = [
        {"$match": {"user_id": current_user.id}},
        {"$lookup": {
            "from": "detections",
            "localField": "_id",
            "foreignField": "video_id",
            "as": "detections"
        }},
        {"$sort": {"uploaded_at": -1}},
        {"$limit": 100}
    ]
    
    videos = await db.videos.aggregate(pipeline).to_list(length=100)
    
    # Fix _id to id for frontend
    results = []
    for v in videos:
        v["id"] = str(v.pop("_id"))
        if "detections" in v:
            for d in v["detections"]:
                if "_id" in d:
                    d["id"] = str(d.pop("_id"))
                if "video_id" in d:
                    d["video_id"] = str(d["video_id"])
        results.append(v)
        
    return results
