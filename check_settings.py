from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["poaching_detection_db"]
settings = db.settings.find_one({"_id": "global_settings"})
print("Settings:", settings)
