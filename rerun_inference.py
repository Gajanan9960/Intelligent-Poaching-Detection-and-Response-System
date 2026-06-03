import asyncio
from db.mongodb import get_database
from services.detection_service import detection_service

async def rerun():
    db = get_database()
    videos = await db.videos.find({"status": "completed"}).to_list(None)
    for v in videos:
        # Re-run inference for all files
        video_id = v["_id"]
        filepath = v["file_path"]
        print(f"Re-running {video_id}")
        # Clear old detections and alerts
        det_docs = await db.detections.find({"video_id": video_id}, {"detection_id": 1}).to_list(None)
        det_ids = [d["detection_id"] for d in det_docs if "detection_id" in d]
        if det_ids:
            await db.alerts.delete_many({"detection_id": {"$in": det_ids}})
        await db.detections.delete_many({"video_id": video_id})
        
        await detection_service.process_video(video_id, filepath)

if __name__ == "__main__":
    detection_service.load_model()
    asyncio.run(rerun())
