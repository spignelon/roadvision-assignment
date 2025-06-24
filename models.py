import cv2
import torch
import numpy as np
import time
import threading
from queue import Queue
import logging

logger = logging.getLogger("vms.models")

class MotionDetector:
    def __init__(self, threshold=25, min_contour_area=500):
        self.threshold = threshold
        self.min_contour_area = min_contour_area
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
        # Load YOLOv5 model
        self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
        self.model.conf = confidence
        # Set to only detect people (class 0 in COCO dataset)
        self.model.classes = [0]  
        
    def detect(self, frame):
        # Convert frame to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Run inference
        results = self.model(rgb_frame)
        
        # Process results
        detections = []
        for *box, conf, cls in results.xyxy[0].cpu().numpy():
            x1, y1, x2, y2 = map(int, box)
            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": float(conf),
                "label": "person"
            })
            
        return detections

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
            
        # Start the capture thread
        self.thread = threading.Thread(target=self._process_stream)
        self.thread.daemon = True
        self.thread.start()
        
        # Start the detection thread
        self.detection_thread = threading.Thread(target=self._process_detection)
        self.detection_thread.daemon = True
        self.detection_thread.start()
        
        logger.info(f"Stream {self.stream_id} started")
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
                success, frame = self.cap.read()
                if not success:
                    logger.warning(f"Failed to read frame from {self.url}")
                    # Try to reconnect
                    self.cap.release()
                    time.sleep(1)
                    self.cap = cv2.VideoCapture(self.url)
                    continue
                    
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
            
            # Draw boxes with different colors based on detection type
            if detection["type"] == "person":
                color = (0, 255, 0)  # Green for people
            else:
                color = (0, 0, 255)  # Red for motion
                
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Add label
            label = f"{detection['type']} {detection['confidence']:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
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
        return {
            "id": self.stream_id,
            "url": self.url,
            "running": self.running,
            "fps": self.fps,
            "detection_enabled": self.config["detection"]["enabled"],
            "motion_enabled": self.config["motion"]["enabled"],
        }