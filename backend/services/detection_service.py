import os
import cv2
import uuid
import torch
import functools
from typing import List, Dict, Any
from datetime import datetime
from ultralytics import YOLO

from db.mongodb import get_database
from schemas.detection import DetectionCreate
from schemas.alert import AlertCreate, AlertStatus
from services.email_service import EmailService

class DetectionService:
    def __init__(self):
        self.model = None
        self.model_path = os.path.join(os.path.dirname(__file__), "..", "models", "best.pt")
        self.email_service = EmailService()
        self.critical_classes = ["poacher", "weapon"]

    def load_model(self):
        """Loads the YOLOv8 model into memory. Called once during FastAPI lifespan startup."""
        print(f"Loading YOLO model from {self.model_path}...")
        # ── PyTorch 2.6+ compatibility ──────────────────────────
        # PyTorch 2.6 changed torch.load default to weights_only=True,
        # which breaks YOLO model loading. Wrap torch.load to force
        # weights_only=False for any call made during model init.
        _original_load = torch.load

        def _patched_load(*args, **kwargs):
            kwargs["weights_only"] = False
            return _original_load(*args, **kwargs)

        torch.load = _patched_load
        try:
            # Check if model exists, if not use a pretrained base model as fallback for dev
            if not os.path.exists(self.model_path):
                print(f"Warning: Model not found at {self.model_path}, using default yolov8n.pt")
                self.model = YOLO("yolov8n.pt")
            else:
                self.model = YOLO(self.model_path)
            print("YOLO model loaded successfully.")
        except Exception as e:
            print(f"Failed to load YOLO model: {e}")
            self.model = None
        finally:
            # Restore original torch.load
            torch.load = _original_load

    async def process_video(self, video_id: str, file_path: str) -> List[Dict[str, Any]]:
        """
        Process a video or image file, run YOLO inference, save results to DB, and trigger alerts.
        """
        if not self.model:
            raise RuntimeError("YOLO model is not loaded.")

        db = get_database()
        
        # 0. Set status to processing
        await db.videos.update_one(
            {"_id": video_id},
            {"$set": {"status": "processing"}}
        )

        try:
            results = self.model(file_path) # Run inference
        except Exception as e:
            print(f"Error during YOLO inference: {e}")
            await db.videos.update_one(
                {"_id": video_id},
                {"$set": {"status": "failed"}}
            )
            return {"detections": [], "alerts": []}

        detections = []
        alerts_generated = []

        is_video = file_path.lower().endswith(('.mp4', '.avi', '.mov'))
        
        # Simplified handling for images vs. videos (acting on image for now based on context)
        # Results is a list of Results objects
        for batch_idx, r in enumerate(results):
            boxes = r.boxes
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = r.names[class_id].lower()
                
                # Domain mapping: COCO class names + custom model names → app categories
                mapping = {
                    # Custom model classes (best.pt)
                    "poacher": "poacher", "hunter": "poacher",
                    "weapon": "weapon", "gun": "weapon", "rifle": "weapon", "pistol": "weapon",
                    "ranger": "ranger", "guard": "ranger",
                    # COCO: person → poacher
                    "person": "poacher",
                    # COCO: weapons (class 43=knife, class 76=scissors)
                    "knife": "weapon", "scissors": "weapon",
                    # COCO: vehicles → ranger (patrol/ranger presence proxy)
                    "car": "ranger", "truck": "ranger", "bus": "ranger",
                    "motorcycle": "ranger", "bicycle": "ranger",
                    # COCO: animals (classes 14-23)
                    "bird": "animal", "cat": "animal", "dog": "animal",
                    "horse": "animal", "sheep": "animal", "cow": "animal",
                    "elephant": "animal", "bear": "animal", "zebra": "animal",
                    "giraffe": "animal",
                    # Custom model animals (non-COCO)
                    "tiger": "animal", "lion": "animal", "rhino": "animal",
                    "deer": "animal", "leopard": "animal",
                }
                
                mapped_class = mapping.get(class_name)
                # If the YOLO class isn't strictly recognized in our domain mapping, drop it.
                if not mapped_class:
                    continue
                    
                class_name = mapped_class

                # Check confidence threshold if needed
                if confidence < 0.3:
                    continue

                # Save detection frame image
                frame_filename = f"{uuid.uuid4()}_frame.jpg"
                frame_path = os.path.join("backend", "static", "images", frame_filename)
                
                # Extract the bounding box crop or just the full image with boxes
                img = r.plot() # Annotates original image with boxes
                cv2.imwrite(frame_path, img)

                # 1. Create Detection Record
                detection_data = DetectionCreate(
                    video_id=video_id,
                    object_type=class_name,
                    confidence_score=confidence,
                    timestamp_in_video=0.0 if not is_video else float(batch_idx)/30.0, # Guessing 30fps
                    frame_image_path=f"/static/images/{frame_filename}"
                )
                
                det_dict = detection_data.model_dump()
                det_dict["detection_id"] = str(uuid.uuid4())
                det_dict.setdefault("detected_at", datetime.utcnow())
                
                result = await db.detections.insert_one(det_dict)
                det_dict["_id"] = str(result.inserted_id)
                detections.append(det_dict)

                # 2. Check if this is a critical threat and trigger alert
                if class_name.lower() in self.critical_classes:
                    print(f"Critical threat detected: {class_name} ({confidence:.2f})")
                    alert_data = AlertCreate(
                        detection_id=det_dict["detection_id"],
                        alert_type=class_name.lower(),
                        officer_email=self.email_service.officer_email,
                        status=AlertStatus.sent
                    )
                    alert_dict = alert_data.model_dump()
                    alert_dict["alert_id"] = str(uuid.uuid4())
                    alert_dict.setdefault("created_at", datetime.utcnow())
                    
                    result = await db.alerts.insert_one(alert_dict)
                    alert_dict["_id"] = str(result.inserted_id)
                    alerts_generated.append(alert_dict)
                    
                    # 3. Dispatch Email Contextually
                    # We run this in the background asynchronously so we don't block the API
                    self.email_service.send_alert_email_background(
                        alert_type=class_name, 
                        confidence=confidence, 
                        image_path=frame_path
                    )
                    
        # 4. Mark video as completed
        await db.videos.update_one(
            {"_id": video_id},
            {"$set": {"status": "completed"}}
        )
        
        return {
            "detections": detections,
            "alerts": alerts_generated
        }

# Global singleton instance
detection_service = DetectionService()
