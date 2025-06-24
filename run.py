from app import app, discover_videos, CONFIG
# Import routes so they get registered
import routes
import os
from pathlib import Path

# Ensure videos directory exists
def ensure_video_dir():
    video_dir = Path(CONFIG["video_dir"])
    if not video_dir.exists():
        print(f"Creating videos directory: {video_dir}")
        video_dir.mkdir(parents=True, exist_ok=True)
        
    # Check if there are any videos
    videos = discover_videos(CONFIG["video_dir"])
    if not videos:
        print(f"No videos found in {CONFIG['video_dir']} directory.")
        print(f"Please add MP4, AVI, MOV, or MKV videos to the {CONFIG['video_dir']} directory.")
    else:
        print(f"Found {len(videos)} videos in {CONFIG['video_dir']} directory.")
        for video in videos:
            print(f"  - {video['name']}")

if __name__ == "__main__":
    from waitress import serve
    # Disable werkzeug logging
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # Check videos directory
    ensure_video_dir()
    
    print("Starting RoadVision backend server...")
    print("API will be available at http://localhost:5000")
    print("Videos will be automatically loaded and processed")
    
    # Run the Flask app
    serve(app, host='0.0.0.0', port=5000, threads=32)