# RoadVision - Video Management System with AI Integration

A lightweight Flask-based Video Management System that can handle multiple video streams and apply AI models for person detection and motion detection.

## Features

- Support for 10+ simultaneous video streams
- YOLO-based person detection (green bounding boxes)
- Motion detection (red bounding boxes)
- REST API for managing streams and retrieving detection results
- Real-time video feeds with annotations
- Local video file support with automatic discovery

## Setup Instructions

### Prerequisites

- Python 3.8+
- pip
- CUDA-compatible GPU (recommended for optimal performance)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/roadvision.git
cd roadvision
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

4. Create a videos directory:
```bash
mkdir -p videos
```

5. Place any test videos in the videos directory:
```bash
cp /path/to/your/videos/*.mp4 videos/
```

### Running the Application

Start the Flask server:

```bash
python run.py
```

The server will be available at `http://localhost:5000`.

## API Reference

### Stream Management

#### List All Streams
```
GET /api/streams
```

**Response:**
```json
[
  {
    "id": "stream1",
    "url": "rtsp://example.com/stream1",
    "name": "stream1",
    "running": true,
    "fps": 25.6,
    "detection_enabled": true,
    "motion_enabled": true,
    "is_local_file": false
  },
  {
    "id": "video_sample",
    "url": "videos/sample.mp4",
    "name": "sample.mp4",
    "running": true,
    "fps": 30.0,
    "detection_enabled": true,
    "motion_enabled": true,
    "is_local_file": true,
    "progress": 45.2,
    "total_frames": 1200,
    "current_frame": 542
  }
]
```

#### Add a New Stream
```
POST /api/streams
```

**Request Body:**
```json
{
  "url": "rtsp://example.com/stream1",
  "id": "custom_id" // Optional, will generate a timestamp ID if not provided
}
```

**Response:**
```json
{
  "id": "custom_id",
  "status": "started"
}
```

#### Delete a Stream
```
DELETE /api/streams/{stream_id}
```

**Response:**
```json
{
  "status": "deleted"
}
```

#### Get Stream Status
```
GET /api/streams/{stream_id}/status
```

**Response:**
```json
{
  "id": "stream1",
  "url": "rtsp://example.com/stream1",
  "name": "stream1",
  "running": true,
  "fps": 25.6,
  "detection_enabled": true,
  "motion_enabled": true,
  "is_local_file": false
}
```

#### Get Latest Detections
```
GET /api/streams/{stream_id}/detections
```

**Response:**
```json
{
  "timestamp": 1656023854.123,
  "detections": [
    {
      "bbox": [100, 200, 300, 400],
      "confidence": 0.91,
      "label": "person",
      "type": "person"
    },
    {
      "bbox": [500, 300, 600, 450],
      "confidence": 1.0,
      "label": "motion",
      "type": "motion"
    }
  ]
}
```

#### Get Snapshot Image
```
GET /api/streams/{stream_id}/snapshot
```

**Response:** JPEG image with annotated detections

#### Get Live Video Feed
```
GET /api/streams/{stream_id}/video_feed
```

**Response:** MJPEG multipart stream of annotated video

### Configuration Management

#### Get Current Configuration
```
GET /api/config
```

**Response:**
```json
{
  "streams": {
    "stream1": {
      "url": "rtsp://example.com/stream1"
    }
  },
  "detection": {
    "enabled": true,
    "model_path": "models/yolov5s.pt",
    "confidence": 0.5
  },
  "motion": {
    "enabled": true,
    "threshold": 25,
    "contour_area": 500
  },
  "video_dir": "videos"
}
```

#### Update Configuration
```
POST /api/config
```

**Request Body:**
```json
{
  "detection": {
    "enabled": false,
    "confidence": 0.7
  },
  "motion": {
    "threshold": 30
  }
}
```

**Response:** Updated configuration object

### System Statistics

#### Get System Statistics
```
GET /api/stats
```

**Response:**
```json
{
  "total_streams": 3,
  "active_streams": 2,
  "streams": [
    {
      "id": "stream1",
      "url": "rtsp://example.com/stream1",
      "name": "stream1",
      "running": true,
      "fps": 25.6,
      "detection_enabled": true,
      "motion_enabled": true,
      "is_local_file": false
    },
    // Additional streams...
  ]
}
```

### Video Management

#### List Available Videos
```
GET /api/videos
```

**Response:**
```json
[
  {
    "id": "video_sample1",
    "url": "videos/sample1.mp4",
    "name": "sample1.mp4"
  },
  {
    "id": "video_sample2",
    "url": "videos/sample2.mp4",
    "name": "sample2.mp4"
  }
]
```

#### Load a Video as Stream
```
POST /api/videos/{video_id}/load
```

**Response:**
```json
{
  "id": "video_sample1",
  "status": "started",
  "name": "sample1.mp4"
}
```

#### Load All Available Videos
```
POST /api/videos/load_all
```

**Response:**
```json
[
  {
    "id": "video_sample1",
    "status": "started",
    "name": "sample1.mp4"
  },
  {
    "id": "video_sample2",
    "status": "already_loaded",
    "name": "sample2.mp4"
  }
]
```

## Usage Examples

### Adding an RTSP Stream
```bash
curl -X POST http://localhost:5000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"url": "rtsp://example.com/stream1"}'
```

### Adding a Webcam Stream
```bash
curl -X POST http://localhost:5000/api/streams \
  -H "Content-Type: application/json" \
  -d '{"url": "0"}'  # 0 is typically the default webcam
```

### Loading a Video File
```bash
curl -X POST http://localhost:5000/api/videos/video_sample/load
```

### Loading All Available Videos
```bash
curl -X POST http://localhost:5000/api/videos/load_all
```

### Adjusting Detection Settings
```bash
curl -X POST http://localhost:5000/api/config \
  -H "Content-Type: application/json" \
  -d '{"detection": {"confidence": 0.7}}'
```

## Viewing the Video Feeds

To view the video feed with annotations in a browser:
- Navigate to `http://localhost:5000/api/streams/{stream_id}/video_feed`
- Or use the snapshot endpoint to get a still image: `http://localhost:5000/api/streams/{stream_id}/snapshot`

## Supported File Formats

RoadVision automatically discovers and can process these video formats:
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- MKV (.mkv)

Simply place your files in the `videos` directory and use the API to load them.

## Troubleshooting

### Missing System Dependencies

If you encounter errors related to missing shared libraries when trying to import OpenCV, you need to install the required system dependencies.

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y libgtk2.0-dev libgl1-mesa-glx libglib2.0-0
```

#### Fedora/RHEL/CentOS:
```bash
sudo dnf install -y gtk2-devel mesa-libGL glib2
```

#### Arch Linux:
```bash
sudo pacman -S gtk2 mesa glib2
```

### OpenCV Import Errors

If you encounter issues specifically with the error `ImportError: libgthread-2.0.so.0: cannot open shared object file: No such file or directory`, install the GTK library:

```bash
# Ubuntu/Debian
sudo apt-get install -y libglib2.0-0

# Fedora/RHEL/CentOS
sudo dnf install -y glib2

# Arch Linux
sudo pacman -S glib2
```

### Python Version Compatibility

This application is tested with Python 3.8-3.10. If you're using Python 3.11 or newer, you might need to use specific versions of dependencies:

```bash
pip install opencv-python-headless==4.5.5.64
```

### CUDA/GPU Support

If you want to enable GPU acceleration:

1. Install the CUDA toolkit appropriate for your GPU
2. Install the GPU version of PyTorch:
```bash
pip uninstall torch torchvision
pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cu117
```

### Firewall Issues

If you can't access the web interface from other computers, check your firewall settings:

```bash
# Ubuntu/Debian
sudo ufw allow 5000

# Fedora/RHEL/CentOS
sudo firewall-cmd --zone=public --add-port=5000/tcp --permanent
sudo firewall-cmd --reload
```