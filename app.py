from flask import Flask, Response, request, jsonify
import cv2
import numpy as np
import threading
import time
import os
import json
from pathlib import Path
import logging
import queue
from typing import Dict, List, Set, Tuple, Optional
import torch
from flask_cors import CORS

from vision import YOLODetector, DummyModel

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("vms")

app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app)

# Global configuration
CONFIG = {
    "streams": {},
    "detection": {
        "enabled": True,
        "model_path": "models/yolov5s.pt",
        "confidence": 0.4,
        "process_every_n_frames": 8  # Increased to reduce CPU load
    },
    "motion": {
        "enabled": True,
        "threshold": 25,
        "contour_area": 300
    },
    "video_dir": "videos"
}

# Global state
streams = {}
detections = {}

# Create a single, shared object detector
try:
    object_detector = YOLODetector(
        model_path=CONFIG["detection"]["model_path"],
        confidence=CONFIG["detection"]["confidence"]
    )
except Exception as e:
    logger.error(f"Failed to load YOLO model: {e}")
    # Fallback to a dummy model if loading fails
    object_detector = DummyModel()

# Function to discover video files in the specified directory
def discover_videos(directory="videos") -> List[Dict]:
    """
    Discover video files in the specified directory
    Returns: List of dictionaries with video information
    """
    video_files = []
    supported_formats = ['.mp4', '.avi', '.mov', '.mkv']
    
    try:
        video_path = Path(directory)
        if not video_path.exists():
            logger.warning(f"Video directory {directory} does not exist. Creating it...")
            video_path.mkdir(parents=True, exist_ok=True)
            
        for file in video_path.glob('**/*'):
            if file.suffix.lower() in supported_formats:
                video_id = f"video_{file.stem}"
                video_files.append({
                    "id": video_id,
                    "url": str(file),
                    "name": file.name
                })
        logger.info(f"Discovered {len(video_files)} videos in {directory}")
    except Exception as e:
        logger.error(f"Error discovering videos: {str(e)}")
    
    return video_files

# Add this to ensure streams get initialized when the app starts
@app.before_request
def before_request():
    # Use this to make sure initialze_streams is only called once
    if not hasattr(app, 'initialized'):
        # This will be defined when routes.py is imported
        # And will be called on first request
        app.initialized = True

# NOTE: For best scalability, use /api/streams/<stream_id>/snapshot for dashboard grid,
# and /api/streams/<stream_id>/video_feed only for single stream view.