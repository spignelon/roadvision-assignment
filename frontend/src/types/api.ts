export interface Stream {
  id: string;
  url: string;
  name: string;
  running: boolean;
  fps: number;
  detection_enabled: boolean;
  motion_enabled: boolean;
  is_local_file: boolean;
  progress?: number;
  total_frames?: number;
  current_frame?: number;
}

export interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  label: string;
}

export interface DetectionData {
  timestamp: number;
  detections: Detection[];
  motion: Detection[];
}

export interface SystemStats {
  total_streams: number;
  active_streams: number;
  streams: Stream[];
}

export interface Video {
  id: string;
  url: string;
  name: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}