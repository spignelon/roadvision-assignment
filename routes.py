from flask import Blueprint, Response, request, jsonify, send_file
import cv2
import numpy as np
import json
import time
import io
from PIL import Image
import threading

from app import app, CONFIG, streams, detections, logger
from models import StreamProcessor

# Define routes
@app.route('/api/streams', methods=['GET'])
def get_streams():
    """Get all configured streams"""
    response = []
    for stream_id, processor in streams.items():
        response.append(processor.get_status())
    return jsonify(response)

@app.route('/api/streams', methods=['POST'])
def add_stream():
    """Add a new stream"""
    data = request.json
    
    if not data or 'url' not in data:
        return jsonify({"error": "URL is required"}), 400
        
    stream_id = data.get('id', str(int(time.time())))
    url = data['url']
    
    if stream_id in streams:
        return jsonify({"error": f"Stream with ID {stream_id} already exists"}), 400
        
    # Create stream processor
    processor = StreamProcessor(stream_id, url, CONFIG)
    
    # Start the stream
    success = processor.start()
    if not success:
        return jsonify({"error": f"Failed to start stream: {url}"}), 400
        
    # Add to streams dict
    streams[stream_id] = processor
    
    # Update config
    CONFIG["streams"][stream_id] = {"url": url}
    
    return jsonify({"id": stream_id, "status": "started"})

@app.route('/api/streams/<stream_id>', methods=['DELETE'])
def delete_stream(stream_id):
    """Delete a stream"""
    if stream_id not in streams:
        return jsonify({"error": f"Stream {stream_id} not found"}), 404
        
    # Stop the stream
    streams[stream_id].stop()
    
    # Remove from streams dict
    del streams[stream_id]
    
    # Update config
    if stream_id in CONFIG["streams"]:
        del CONFIG["streams"][stream_id]
        
    return jsonify({"status": "deleted"})

@app.route('/api/streams/<stream_id>/status', methods=['GET'])
def get_stream_status(stream_id):
    """Get stream status"""
    if stream_id not in streams:
        return jsonify({"error": f"Stream {stream_id} not found"}), 404
        
    return jsonify(streams[stream_id].get_status())

@app.route('/api/streams/<stream_id>/detections', methods=['GET'])
def get_stream_detections(stream_id):
    """Get latest detections for a stream"""
    if stream_id not in streams:
        return jsonify({"error": f"Stream {stream_id} not found"}), 404
        
    result = streams[stream_id].get_latest_result()
    if result is None:
        return jsonify({"detections": []})
        
    # Remove the frame from the result to reduce response size
    result_copy = result.copy()
    if "frame" in result_copy:
        del result_copy["frame"]
        
    return jsonify(result_copy)

@app.route('/api/streams/<stream_id>/snapshot', methods=['GET'])
def get_stream_snapshot(stream_id):
    """Get a snapshot from the stream"""
    if stream_id not in streams:
        return jsonify({"error": f"Stream {stream_id} not found"}), 404
        
    # Get the latest frame with detections
    result = streams[stream_id].get_latest_result()
    
    if result is None or "frame" not in result:
        # Fallback to raw frame
        frame = streams[stream_id].get_latest_frame()
    else:
        frame = result["frame"]
        
    # Convert to JPEG
    _, buffer = cv2.imencode('.jpg', frame)
    io_buf = io.BytesIO(buffer)
    
    return send_file(io_buf, mimetype='image/jpeg')

@app.route('/api/streams/<stream_id>/video_feed')
def video_feed(stream_id):
    """Video streaming route for a specific stream"""
    if stream_id not in streams:
        return jsonify({"error": f"Stream {stream_id} not found"}), 404
        
    def generate():
        while streams.get(stream_id) and streams[stream_id].running:
            result = streams[stream_id].get_latest_result()
            
            if result is None or "frame" not in result:
                # Fallback to raw frame
                frame = streams[stream_id].get_latest_frame()
            else:
                frame = result["frame"]
                
            # Convert to JPEG
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.1)  # Limit frame rate
            
    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current configuration"""
    return jsonify(CONFIG)

@app.route('/api/config', methods=['POST'])
def update_config():
    """Update configuration"""
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    # Update detection config
    if "detection" in data:
        CONFIG["detection"].update(data["detection"])
        
    # Update motion config
    if "motion" in data:
        CONFIG["motion"].update(data["motion"])
        
    # Apply changes to existing streams
    for stream_id, processor in streams.items():
        processor.config = CONFIG
        
    return jsonify(CONFIG)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    stats = {
        "total_streams": len(streams),
        "active_streams": sum(1 for s in streams.values() if s.running),
        "streams": [s.get_status() for s in streams.values()]
    }
    return jsonify(stats)

# Initialize any existing streams on startup
@app.before_first_request
def initialize_streams():
    for stream_id, stream_config in CONFIG["streams"].items():
        processor = StreamProcessor(stream_id, stream_config["url"], CONFIG)
        processor.start()
        streams[stream_id] = processor
        logger.info(f"Initialized stream {stream_id}")