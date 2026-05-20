import os
import cv2
import uuid
import torch
import functools
import asyncio
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
        self.inference_lock = asyncio.Lock()

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
                self.model = YOLO(self.model_path, task="detect")
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
        db = get_database()
        
        try:
            if not self.model:
                raise RuntimeError("YOLO model is not loaded.")
            
            # 0. Set status to processing
            await db.videos.update_one(
                {"_id": video_id},
                {"$set": {"status": "processing"}}
            )

            # Fetch global settings
            settings = await db.settings.find_one({"_id": "global_settings"})
            if not settings:
                settings = {"confidence_threshold": 65, "email_alerts": True, "strict_mode": False}
            
            global_thresh = settings.get("confidence_threshold", 65) / 100.0
            email_alerts = settings.get("email_alerts", True)
            strict_mode = settings.get("strict_mode", False)

            # Prevent PyTorch/ONNX from running out of memory during bulk uploads
            # by locking inference to one concurrent request at a time
            async with self.inference_lock:
                loop = asyncio.get_running_loop()
                # Offload blocking YOLO inference to a background thread to prevent freezing the FastAPI event loop
                # stream=False ensures the generator is fully consumed in the background thread
                results = await loop.run_in_executor(
                    None,
                    functools.partial(
                        self.model, file_path, stream=False, imgsz=800, iou=0.45, augment=True
                    )
                )

            detections = []
            alerts_generated = []

            is_video = file_path.lower().endswith(('.mp4', '.avi', '.mov'))
            
            # Simplified handling for images vs. videos (acting on image for now based on context)
            # Results is a list of Results objects
            for batch_idx, r in enumerate(results):
                boxes = r.boxes
                valid_boxes = []
                has_ranger = False
                has_poacher = False
                has_animal = False
                
                for box in boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    class_name = r.names[class_id].lower()
                    
                    # Domain mapping: COCO class names + custom model names → app categories
                    mapping = {
                        # Custom model classes (best.pt)
                        "animal": "animal", "animals": "animal",
                        "weapons": "weapon", "weapon": "weapon",
                        "poacher": "poacher", "hunter": "poacher",
                        "gun": "weapon", "rifle": "weapon", "pistol": "weapon",
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

                    # Check confidence threshold if needed
                    thresh = global_thresh
                    if strict_mode and mapped_class == "weapon":
                        thresh = min(global_thresh, 0.20)  # Zero-tolerance mode lowers weapon threshold

                    if confidence < thresh:
                        continue

                    valid_boxes.append((box, mapped_class, confidence))
                    if mapped_class == "ranger":
                        has_ranger = True
                    elif mapped_class == "poacher":
                        has_poacher = True
                    elif mapped_class == "animal":
                        has_animal = True
                        
                # Pre-filter boxes
                final_boxes = []
                for box, mapped_class, confidence in valid_boxes:
                    # Rule: ranger and poacher cannot be together in the same frame
                    # We suppress 'poacher' detections if a 'ranger' is detected
                    if mapped_class == "poacher" and has_ranger:
                        continue
                    final_boxes.append((box, mapped_class, confidence))

                if not final_boxes:
                    continue

                # Save detection frame image ONCE per frame
                frame_filename = f"{uuid.uuid4()}_frame.jpg"
                frame_path = os.path.join("backend", "static", "images", frame_filename)
                
                # Extract the bounding box crop or just the full image with boxes
                img = r.plot() # Annotates original image with boxes
                cv2.imwrite(frame_path, img)

                for box, mapped_class, confidence in final_boxes:
                    class_name = mapped_class

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
                    is_critical = False
                    if class_name == "poacher":
                        is_critical = True
                    elif class_name == "weapon":
                        # Rule: If a ranger and weapon are detected together, it is safe
                        # Rule: If weapon is with poacher or animal, it is high-risk threat
                        if has_ranger:
                            is_critical = False
                        else:
                            is_critical = True
                    
                    if is_critical:
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
                        if email_alerts:
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
        except Exception as e:
            import traceback
            print(f"Error in process_video for {video_id}: {e}")
            traceback.print_exc()
            await db.videos.update_one(
                {"_id": video_id},
                {"$set": {"status": "failed", "error": str(e)}}
            )
            return {"detections": [], "alerts": []}

# Global singleton instance
detection_service = DetectionService()
