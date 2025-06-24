import os
import sys
import torch
from pathlib import Path

def download_yolo_model():
    print("Downloading YOLOv5s model...")
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    
    model_path = models_dir / "yolov5s.pt"
    
    if model_path.exists():
        print(f"Model already exists at {model_path}")
        return
    
    try:
        # Temporarily modify sys.path to avoid conflicts
        sys.path.insert(0, os.getcwd())
        
        # Download the model
        torch.hub._validate_not_a_forked_repo = lambda a, b, c: True
        model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
        
        # Save the model
        torch.save(model.state_dict(), model_path)
        print(f"Model downloaded and saved to {model_path}")
        
        # Restore sys.path
        sys.path.pop(0)
    except Exception as e:
        print(f"Error downloading model: {e}")
        print("You can manually download the model from:")
        print("https://github.com/ultralytics/yolov5/releases/download/v6.1/yolov5s.pt")
        print(f"And save it to {model_path}")

if __name__ == "__main__":
    download_yolo_model()
