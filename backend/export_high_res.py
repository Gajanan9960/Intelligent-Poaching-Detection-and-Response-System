import torch
import os
from ultralytics import YOLO

# ── PyTorch 2.6+ compatibility ──────────────────────────
_original_load = torch.load

def _patched_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _original_load(*args, **kwargs)

torch.load = _patched_load

def export_high_res_model():
    model_path = os.path.join(os.path.dirname(__file__), "models", "best.pt")
    output_name = "best_high_res.onnx"
    
    print(f"Loading custom model from {model_path}...")
    try:
        model = YOLO(model_path)
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    print("Exporting to ONNX with imgsz=800 and half=True...")
    # Exporting at 800 gives it a higher base resolution for ONNX processing
    model.export(format="onnx", imgsz=800, half=True, dynamic=False, simplify=True)
    
    # Ultralytics exports to the same directory as the .pt file with the .onnx extension.
    # We will rename it to best_high_res.onnx
    exported_path = os.path.join(os.path.dirname(__file__), "models", "best.onnx")
    final_path = os.path.join(os.path.dirname(__file__), "models", output_name)
    
    if os.path.exists(exported_path):
        os.rename(exported_path, final_path)
        print(f"Successfully exported and renamed to {final_path}")
    else:
        print(f"Warning: Exported file not found at {exported_path}. Check if ultralytics named it differently.")

if __name__ == "__main__":
    export_high_res_model()
