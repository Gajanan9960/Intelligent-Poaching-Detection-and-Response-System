from pymongo import MongoClient
import os
client = MongoClient("mongodb://localhost:27017/")
db = client["poaching_detection_db"]
db.videos.delete_many({"status": "completed"})
db.detections.delete_many({})
db.alerts.delete_many({})
print("Wiped old videos from db")
