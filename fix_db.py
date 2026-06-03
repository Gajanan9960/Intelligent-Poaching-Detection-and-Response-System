from pymongo import MongoClient
import sys

client = MongoClient("mongodb://localhost:27017/")
db = client.poaching_detection_db

# Find all processing videos
processing = list(db.videos.find({"status": "processing"}))
if not processing:
    print("No stuck videos found.")
else:
    print(f"Found {len(processing)} stuck videos. Resetting to 'failed' so user can see error or delete.")
    result = db.videos.update_many({"status": "processing"}, {"$set": {"status": "failed", "error": "Server restarted during analysis."}})
    print(f"Updated {result.modified_count} videos.")

