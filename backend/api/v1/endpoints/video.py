import os
import shutil
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
from backend.core.email import send_email
from model.detector import PoachingDetector

router = APIRouter()

# Initialize detector (loading model might take time, do it globally or on startup)
# For simplicity, we assume it's fast enough or loaded here.
detector = PoachingDetector()

async def process_video_task(video_id: str, file_path: str, user_email: str):
    db = get_database()
    await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.processing}})
    
    # Define callback to handle detections
    def handle_detection(detection):
        # detection is a dict: {timestamp, class, confidence, frame}
        # Save frame if critical
        image_url = None
        if detection["class"] in ["poacher", "weapon"]:
            frame_filename = f"{uuid4()}.jpg"
            save_path = f"backend/static/images/{frame_filename}"
            cv2.imwrite(save_path, detection["frame"])
            image_url = f"/static/images/{frame_filename}"
            
            # Send Email Alert
            # Since this callback is sync (called from sync detector), we need to schedule async email
            # or run it in a loop. For simplicity in this structure:
            # We will use fire-and-forget approach or simple loop access if possible.
            # BUT: accessing async implementation from sync callback is tricky.
            # Hack: Create a separate async task or use loop.call_soon_threadsafe
            pass
            
            # Store immediate alert necessity
            detection["image_url"] = image_url
            detection["alert_needed"] = True
        
        # Store in DB
        # We need async here too.
        # This architectural mismatch (Sync CV2 vs Async Mongo) needs handling.
        # Efficient way: Accumulate detections and bulk insert after, OR run detector in thread and use queue.
        # For intermediate level: simple list accumulation is okay.
        return detection

    # Run detection in thread pool to avoid blocking
    loop = asyncio.get_running_loop()
    
    # We need to modify detector to NOT take a callback but return a generator or list
    # OR we wrap the sync call and handle results.
    # Let's assume we modify detector.py to yield results or return list.
    # Re-implementing simplified logic here for clarity as 'detector' code is external.
    # Actually, let's just run the sync process and capture results if we refactor detector to be generator.
    # Since I wrote detector.py to take a callback, let's adapt it or rewrite the call.
    
    # ADAPTATION: Wrapper to run sync function in executor
    def run_detection_sync():
        detections_found = []
        cap = cv2.VideoCapture(file_path)
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
            results = detector.model(frame, verbose=False)
            for r in results:
                for box in r.boxes:
                    c = int(box.cls)
                    label = detector.model.names[c]
                    conf = float(box.conf)
                    detected_class = None
                    if label == 'person': detected_class = 'poacher' # DEMO LOGIC
                    elif c in detector.target_classes and label != 'person': detected_class = 'animal'
                    
                    if detected_class:
                        timestamp = datetime.now()
                        image_url = None
                        if detected_class in ["poacher", "weapon"]:
                            frame_filename = f"{uuid4()}.jpg"
                            img_path = os.path.join("backend/static/images", frame_filename)
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

    detections = await loop.run_in_executor(None, run_detection_sync)

    # Save detections to DB
    if detections:
        await db.detections.insert_many(detections)
        
        # Check if we need to send alerts
        alerts = [d for d in detections if d["detected_class"] in ["poacher", "weapon"]]
        if alerts:
             # Send one synthesized email (async)
             first_alert = alerts[0]
             image_content = None
             if first_alert["image_url"]:
                 path = f"backend/static/images/{os.path.basename(first_alert['image_url'])}"
                 async with aiofiles.open(path, "rb") as f:
                     image_content = await f.read()
             
             await send_email(
                 subject=f"ALERT: {first_alert['detected_class']} Usage Detected!",
                 recipients=[user_email],
                 body=f"Detected {len(alerts)} critical instances. First detected {first_alert['detected_class']} with {first_alert['confidence']:.2f} confidence.",
                 attachments=[{"filename": "alert.jpg", "content": image_content}] if image_content else []
             )

    await db.videos.update_one({"_id": video_id}, {"$set": {"status": VideoStatus.completed}})


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(deps.get_current_user)
):
    video_id = str(uuid4())
    secure_name = os.path.basename(file.filename).replace(" ", "_").replace("/", "").replace("\\", "")
    file_location = f"backend/static/videos/{video_id}_{secure_name}"
    
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

@router.get("/list", response_model=List[Video])
async def list_videos(
    current_user: User = Depends(deps.get_current_user)
):
    db = get_database()
    videos_cursor = db.videos.find({"user_id": current_user.id}).sort("uploaded_at", -1)
    videos = await videos_cursor.to_list(length=100)
    
    # Enrich with detections? Or make separate call. For MVP, simple embedding or separate call.
    # We defined Video model to have 'detections: List[Detection] = []'
    # So let's fetch detections for each video.
    # Optimization: $lookup in aggregation.
    
    args = [
        {"$match": {"user_id": current_user.id}},
        {"$lookup": {
            "from": "detections",
            "localField": "_id",
            "foreignField": "video_id",
            "as": "detections"
        }},
        {"$sort": {"uploaded_at": -1}}
    ]
    
    videos = await db.videos.aggregate(args).to_list(length=100)
    
    # Fix _id to id for Pydantic
    results = []
    for v in videos:
        v["id"] = str(v["_id"])
        if "detections" in v:
            for d in v["detections"]:
                d["id"] = str(d["_id"])
        results.append(v)
        
    return results
