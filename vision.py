import cv2
import torch
import numpy as np
import time
import threading
from queue import Queue
import logging
import os
from pathlib import Path
import sys

logger = logging.getLogger("vms.models")

class MotionDetector:
    def __init__(self, threshold=25, min_contour_area=500):
        self.threshold = 15  # Lowered for increased sensitivity
        self.min_contour_area = 200  # Lowered to detect smaller objects
        self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=100, varThreshold=50, detectShadows=True
        )
        
    def detect(self, frame):
        # Apply background subtraction
        fg_mask = self.background_subtractor.apply(frame)
        
        # Remove shadows (gray pixels)
        _, thresh = cv2.threshold(fg_mask, 128, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        motion_regions = []
        for contour in contours:
            if cv2.contourArea(contour) > self.min_contour_area:
                x, y, w, h = cv2.boundingRect(contour)
                motion_regions.append({
                    "bbox": [x, y, x+w, y+h],
                    "confidence": 1.0,
                    "label": "motion"
                })
                
        return motion_regions
        
class YOLODetector:
    def __init__(self, model_path, confidence=0.5):
        self.confidence = confidence
        
        # Check if model exists
        if not os.path.exists(model_path):
            logger.info(f"Model {model_path} not found, downloading to models directory...")
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            # Alternative loading method to avoid package conflict
            try:
                # Add cwd to path temporarily to avoid conflict with our models.py
                sys.path.insert(0, os.getcwd())
                
                # Download and load model differently to avoid the conflict
                import torch.hub
                torch.hub._validate_not_a_forked_repo = lambda a, b, c: True
                self.model = torch.hub.load(
                    'ultralytics/yolov5',
                    'yolov5s',  # Use a specific model instead of 'custom'
                    pretrained=True,
                    verbose=False
                )
                sys.path.pop(0)  # Remove the temporary path
            except Exception as e:
                logger.error(f"Error loading model: {str(e)}")
                logger.info("Falling back to loading without running detection")
                # Create a dummy model for graceful degradation
                self.model = DummyModel()
        else:
            # Model exists, load it directly
            try:
                sys.path.insert(0, os.getcwd())
                import torch.hub
                torch.hub._validate_not_a_forked_repo = lambda a, b, c: True
                self.model = torch.hub.load(
                    'ultralytics/yolov5',
                    'custom',
                    path=model_path,
                    verbose=False
                )
                sys.path.pop(0)
            except Exception as e:
                logger.error(f"Error loading model: {str(e)}")
                self.model = DummyModel()
                
        # Set confidence threshold
        self.model.conf = 0.3  # Lower confidence for broader detection
        # Set to only detect people (class 0 in COCO dataset)
        self.model.classes = None  # Detect all classes
        
    def detect(self, frame):
        try:
            # Convert frame to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Run inference
            results = self.model(rgb_frame)
            
            # Process results
            detections = []
            for *box, conf, cls in results.xyxy[0].cpu().numpy():
                x1, y1, x2, y2 = map(int, box)
                class_id = int(cls)
                class_name = self.model.names[class_id] if class_id < len(self.model.names) else "unknown"
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": float(conf),
                    "label": class_name
                })
                
            return detections
        except Exception as e:
            logger.error(f"Error in detection: {str(e)}")
            return []

# Dummy model class for graceful degradation
class DummyModel:
    """A fallback model that returns empty results when the real model fails to load"""
    
    def __init__(self):
        self.conf = 0.5
        self.classes = [0]
        logger.warning("Using dummy model - no detections will be made!")
        
    def __call__(self, frame):
        # Return a dummy result structure compatible with the expected format
        class DummyResults:
            def __init__(self):
                self.xyxy = [torch.zeros((0, 6))]  # Empty tensor with shape (0, 6)
        
        return DummyResults()

class StreamProcessor:
    def __init__(self, stream_id, url, config):
        self.stream_id = stream_id
        self.url = url
        self.config = config
        self.cap = None
        self.running = False
        self.thread = None
        self.latest_frame = None
        self.frame_queue = Queue(maxsize=10)
        self.result_queue = Queue(maxsize=30)
        self.fps = 0
        self.is_local_file = os.path.isfile(url)
        self.video_name = Path(url).name if self.is_local_file else url
        self.last_frame_time = 0
        self.original_fps = 0
        self.frame_count = 0
        self.total_frames = 0
        self.motion_detector = MotionDetector(
            threshold=config["motion"]["threshold"],
            min_contour_area=config["motion"]["contour_area"]
        )
        self.object_detector = YOLODetector(
            model_path=config["detection"]["model_path"],
            confidence=config["detection"]["confidence"]
        )
        
    def start(self):
        if self.running:
            return
            
        self.running = True
        self.cap = cv2.VideoCapture(self.url)
        if not self.cap.isOpened():
            logger.error(f"Failed to open stream: {self.url}")
            self.running = False
            return False
            
        # Get video properties
        self.original_fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT)) if self.is_local_file else 0
        
        # Start the capture thread
        self.thread = threading.Thread(target=self._process_stream)
        self.thread.daemon = True
        self.thread.start()
        
        # Start the detection thread
        self.detection_thread = threading.Thread(target=self._process_detection)
        self.detection_thread.daemon = True
        self.detection_thread.start()
        
        if self.is_local_file:
            self.start_time = time.time()  # For local video pacing
            
        logger.info(f"Stream {self.stream_id} started: {self.video_name}")
        return True
        
    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        if self.detection_thread and self.detection_thread.is_alive():
            self.detection_thread.join(timeout=1.0)
        if self.cap:
            self.cap.release()
        logger.info(f"Stream {self.stream_id} stopped")
        
    def _process_stream(self):
        last_time = time.time()
        frame_count = 0
        
        while self.running:
            try:
                if self.is_local_file and self.original_fps > 0:
                    target_time = self.frame_count / self.original_fps
                    elapsed = time.time() - self.start_time
                    if elapsed < target_time:
                        time.sleep(target_time - elapsed)
                
                success, frame = self.cap.read()
                
                if not success:
                    if not self.is_local_file:
                        logger.warning(f"Failed to read frame from {self.url}")
                        # Try to reconnect for network streams
                        self.cap.release()
                        time.sleep(1)
                        self.cap = cv2.VideoCapture(self.url)
                        continue
                    else:
                        # For local files, loop back to the beginning
                        logger.info(f"End of video {self.url}, looping back")
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        self.frame_count = 0
                        continue
                
                self.frame_count += 1
                    
                # Calculate FPS
                current_time = time.time()
                frame_count += 1
                if (current_time - last_time) > 1.0:
                    self.fps = frame_count / (current_time - last_time)
                    frame_count = 0
                    last_time = current_time
                
                # Store latest frame
                self.latest_frame = frame.copy()
                
                # Add to processing queue, dropping frames if queue is full
                if not self.frame_queue.full():
                    self.frame_queue.put(frame)
                    
            except Exception as e:
                logger.error(f"Error processing stream {self.stream_id}: {str(e)}")
                time.sleep(0.1)
                
    def _process_detection(self):
        while self.running:
            try:
                if self.frame_queue.empty():
                    time.sleep(0.01)
                    continue
                    
                frame = self.frame_queue.get()
                
                # Process with detectors
                results = {"timestamp": time.time(), "detections": []}
                
                # Motion detection
                if self.config["motion"]["enabled"]:
                    motion_detections = self.motion_detector.detect(frame)
                    for detection in motion_detections:
                        detection["type"] = "motion"
                        results["detections"].append(detection)
                        
                # Object detection
                if self.config["detection"]["enabled"]:
                    object_detections = self.object_detector.detect(frame)
                    for detection in object_detections:
                        detection["type"] = "person"
                        results["detections"].append(detection)
                
                # Add annotated frame
                annotated_frame = self._annotate_frame(frame.copy(), results["detections"])
                results["frame"] = annotated_frame
                
                # Store results
                if not self.result_queue.full():
                    self.result_queue.put(results)
                else:
                    # Remove oldest result if queue is full
                    self.result_queue.get()
                    self.result_queue.put(results)
                    
            except Exception as e:
                logger.error(f"Error in detection for stream {self.stream_id}: {str(e)}")
                time.sleep(0.1)
                
    def _annotate_frame(self, frame, detections):
        for detection in detections:
            x1, y1, x2, y2 = detection["bbox"]
            label = detection["label"]
            
            # Draw boxes with different colors
            if label == "person":
                color = (0, 255, 0)  # Green for person
            else:
                color = (0, 0, 255)  # Red for any other class

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame,
                        f"{label} {detection['confidence']:.2f}",
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        color,
                        2)
        return frame
        
    def get_latest_frame(self):
        if self.latest_frame is None:
            # Return a blank frame if no frame is available
            return np.zeros((480, 640, 3), dtype=np.uint8)
        return self.latest_frame
        
    def get_latest_result(self):
        if self.result_queue.empty():
            return None
        return self.result_queue.queue[-1]  # Get latest without removing
        
    def get_status(self):
        status = {
            "id": self.stream_id,
            "url": self.url,
            "name": self.video_name,
            "running": self.running,
            "fps": self.fps,
            "detection_enabled": self.config["detection"]["enabled"],
            "motion_enabled": self.config["motion"]["enabled"],
            "is_local_file": self.is_local_file,
        }
        
        if self.is_local_file:
            status.update({
                "progress": (self.frame_count / self.total_frames) * 100 if self.total_frames > 0 else 0,
                "total_frames": self.total_frames,
                "current_frame": self.frame_count
            })
            
        return status

def draw_detections(frame, result):
    """Draw detections and motion on a frame"""
    
    # Draw object detections (people)
    if result.get("detections"):
        for det in result["detections"]:
            x1, y1, x2, y2 = det["bbox"]
            label = det["label"]
            conf = det["confidence"]
            
            # Green box for people
            color = (0, 255, 0)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Add label
            label_text = f"{label}: {conf:.2f}"
            cv2.putText(frame, label_text, (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Draw motion regions
    if result.get("motion"):
        for mot in result["motion"]:
            x1, y1, x2, y2 = mot["bbox"]
            
            # Red box for motion
            color = (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Add label
            cv2.putText(frame, "motion", (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                        
    return frame