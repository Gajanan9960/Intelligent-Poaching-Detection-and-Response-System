import cv2
from ultralytics import YOLO
import os
from datetime import datetime

class PoachingDetector:
    def __init__(self, model_path="yolov8n.pt"):
        # Download model if not exists, YOLO class does this automatically
        self.model = YOLO(model_path)
        # COCO classes: 
        # We need to map or train custom model. 
        # For this MVP, we will use standard COCO classes that might approximate, 
        # OR assume we have a custom model.
        # However, seeing constraints, I will use standard YOLOv8n and map:
        # person -> poacher/ranger (logic needed), elephant/zebra/etc -> animal.
        # But user asked to detect: ranger, poacher, weapon, animal.
        # This usually requires a Custom Trained Model.
        # I will document this. For now, I will use a placeholder logic utilizing 'person' and 'animal' classes from COCO.
        # 0: person
        # 14: bird, 15: cat, 16: dog, 17: horse, 18: sheep, 19: cow, 20: elephant, 21: bear, 22: zebra, 23: giraffe
        
        self.target_classes = [0, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] 

    def process_video(self, video_path: str, output_path: str, callback=None):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("Error opening video file")
            return

        detection_summary = []
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            # Run YOLOv8 inference on the frame
            results = self.model(frame)

            # Process detections
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    c = int(box.cls)
                    conf = float(box.conf)
                    
                    # Naive mapping for demo purposes if not custom trained
                    label = self.model.names[c]
                    detected_class = None
                    
                    if label == 'person':
                        # In a real system, we'd distinguish ranger vs poacher by uniform/verified ID
                        # Here, we might just flag 'person' as 'potential poacher' for the demo
                        detected_class = 'poacher' 
                    elif c in list(range(14, 24)):
                        detected_class = 'animal'
                    
                    # Note: 'weapon' is not in COCO (except maybe knife/scissor). 
                    # We would need a custom model for weapons.
                    
                    if detected_class:
                        detection = {
                            "timestamp": datetime.now(),
                            "class": detected_class,
                            "confidence": conf,
                            "frame": frame # Pass frame for saving if needed
                        }
                        
                        if callback:
                            callback(detection)

        cap.release()
        cv2.destroyAllWindows()
