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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("vms")

app = Flask(__name__)

# Global configuration
CONFIG = {
    "streams": {},
    "detection": {
        "enabled": True,
        "model_path": "models/yolov5s.pt",
        "confidence": 0.5
    },
    "motion": {
        "enabled": True,
        "threshold": 25,
        "contour_area": 500
    }
}

# Global state
streams = {}
detections = {}