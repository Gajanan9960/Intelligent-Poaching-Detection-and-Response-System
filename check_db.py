from pymongo import MongoClient
import json
from bson import json_util

client = MongoClient("mongodb://localhost:27017/")
db = client["poaching_detection_db"]
videos = list(db.videos.find().sort("uploaded_at", -1).limit(6))
for v in videos:
    print(f"File: {v.get('filename')}, Detections: {len(v.get('detections', []))}")
    for d in v.get('detections', []):
        print(f"  Class: {d.get('detected_class')}, Conf: {d.get('confidence')}")
