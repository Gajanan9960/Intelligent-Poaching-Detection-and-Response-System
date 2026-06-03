import asyncio
from db.mongodb import get_database

async def main():
    db = get_database()
    await db.settings.update_one(
        {"_id": "global_settings"},
        {"$set": {"confidence_threshold": 35}},
        upsert=True
    )
    print("Lowered global confidence threshold to 35% to allow refined model detections through.")

if __name__ == "__main__":
    asyncio.run(main())
