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


async def process_video_task(video_id: str, file_path: str, user_email: str):
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
        cap = cv2.VideoCapture(file_path)
        frame_count = 0
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            
            # Process every 5th frame to reduce load
            frame_count += 1
            if frame_count % 5 != 0:
                continue
                
            results = detector.model(frame, verbose=False)
            for r in results:
                for box in r.boxes:
                    c = int(box.cls)
                    label = detector.model.names[c]
                    conf = float(box.conf)
                    detected_class = None
                    if label == 'person':
                        detected_class = 'poacher'
                    elif c in detector.target_classes and label != 'person':
                        detected_class = 'animal'
                    
                    if detected_class:
                        timestamp = datetime.now()
                        image_url = None
                        if detected_class in ["poacher", "weapon"]:
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
        cap.release()
        return detections_found

    try:
        detections = await loop.run_in_executor(None, run_detection_sync)

        # Save detections to DB
        if detections:
            await db.detections.insert_many(detections)
            
            # Check if we need to send alerts
            alerts = [d for d in detections if d["detected_class"] in ["poacher", "weapon"]]
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
        print(f"Video processing failed for {video_id}: {e}")
        await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.failed}})


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(deps.get_current_user)
):
    video_id = str(uuid4())
    secure_name = os.path.basename(file.filename).replace(" ", "_").replace("/", "").replace("\\", "")
    
    # Ensure upload directory exists
    video_dir = os.path.join("backend", "static", "videos")
    os.makedirs(video_dir, exist_ok=True)
    
    file_location = os.path.join(video_dir, f"{video_id}_{secure_name}")
    
    async with aiofiles.open(file_location, 'wb') as out_file:
        while content := await file.read(1024 * 1024):
            await out_file.write(content)
    
    db = get_database()
    video_doc = {
        "_id": video_id,
        "filename": file.filename,
        "user_id": current_user.id,
        "uploaded_at": datetime.now(),
        "status": VideoStatus.pending,
        "file_path": file_location
    }
    await db.videos.insert_one(video_doc)
    
    background_tasks.add_task(process_video_task, video_id, file_location, current_user.email)
    
    return {"id": video_id, "status": "pending", "message": "Video uploaded and processing started"}

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
        v["id"] = str(v["_id"])
        if "detections" in v:
            for d in v["detections"]:
                d["id"] = str(d.get("_id", ""))
        results.append(v)
        
    return results
