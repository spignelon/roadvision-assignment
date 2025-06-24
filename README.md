# Video Management System with AI Integration

This is a lightweight Flask-based Video Management System that can handle multiple video streams and apply AI models for person detection and motion detection.

## Features

- Support for 10+ simultaneous video streams
- YOLO-based person detection (green bounding boxes)
- Motion detection (red bounding boxes)
- REST API for managing streams and retrieving detection results
- Real-time video feeds with annotations

## Setup Instructions

### Prerequisites

- Python 3.8+
- pip
- CUDA-compatible GPU (recommended for optimal performance)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/vms-ai.git
cd vms-ai
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install the required dependencies:
```bash
pip install -r requirements.txt
```

4. Download the YOLOv5 model:
```bash
mkdir -p models
# YOLOv5s model will be downloaded automatically on first run
```

### Running the Application

Start the Flask server:

```bash
python run.py
```

The server will be available at `http://localhost:5000`.

## API Endpoints

- `GET /api/streams` - List all streams
- `POST /api/streams` - Add a new stream (body: `{"url": "rtsp://example.com/stream"}`)
- `DELETE /api/streams/{id}` - Delete a stream
- `GET /api/streams/{id}/status` - Get stream status
- `GET /api/streams/{id}/detections` - Get latest detections
- `GET /api/streams/{id}/snapshot` - Get a snapshot image with annotations
- `GET /api/streams/{id}/video_feed` - Get live video feed with annotations
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration
- `GET /api/stats` - Get system statistics

## Adding Streams

To add a stream, send a POST request to `/api/streams` with the stream URL:

```bash
curl -X POST http://localhost:5000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"url": "rtsp://example.com/stream1"}'
```

## Testing with Sample Videos

You can test with local video files by using:

```bash
curl -X POST http://localhost:5000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"url": "path/to/your/video.mp4"}'
```

Or use webcam:

```bash
curl -X POST http://localhost:5000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"url": "0"}'  # 0 is typically the default webcam
```