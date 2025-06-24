import { Stream, DetectionData, SystemStats, Video } from '../types/api';

const API_BASE_URL = 'http://localhost:5000/api';

export class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return response as unknown as T;
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Stream management
  async getStreams(): Promise<Stream[]> {
    try {
      const streams = await this.request<Stream[]>('/streams');
      // Ensure all streams have required properties with defaults
      return streams.map(stream => ({
        id: stream.id || 'unknown',
        url: stream.url || '',
        name: stream.name || stream.id || 'Unknown Stream',
        running: stream.running || false,
        fps: stream.fps || 0,
        detection_enabled: stream.detection_enabled || false,
        motion_enabled: stream.motion_enabled || false,
        is_local_file: stream.is_local_file || false,
        progress: stream.progress,
        total_frames: stream.total_frames,
        current_frame: stream.current_frame,
      }));
    } catch (error) {
      console.error('Failed to fetch streams:', error);
      return [];
    }
  }

  async addStream(url: string, id?: string) {
    return this.request<{ id: string; status: string }>('/streams', {
      method: 'POST',
      body: JSON.stringify({ url, id }),
    });
  }

  async deleteStream(streamId: string) {
    return this.request<{ status: string }>(`/streams/${streamId}`, {
      method: 'DELETE',
    });
  }

  async getStreamStatus(streamId: string): Promise<Stream> {
    return this.request<Stream>(`/streams/${streamId}/status`);
  }

  async getDetections(streamId: string): Promise<DetectionData> {
    try {
      const detection = await this.request<DetectionData>(`/streams/${streamId}/detections`);
      // Ensure detection data has the required structure
      return {
        timestamp: detection.timestamp || Date.now() / 1000,
        detections: Array.isArray(detection.detections) ? detection.detections : [],
        motion: Array.isArray(detection.motion) ? detection.motion : [],
      };
    } catch (error) {
      console.error(`Failed to fetch detections for stream ${streamId}:`, error);
      // Return empty detection data instead of throwing
      return {
        timestamp: Date.now() / 1000,
        detections: [],
        motion: [],
      };
    }
  }

  // System stats
  async getSystemStats(): Promise<SystemStats> {
    try {
      const stats = await this.request<SystemStats>('/stats');
      return {
        total_streams: stats.total_streams || 0,
        active_streams: stats.active_streams || 0,
        streams: Array.isArray(stats.streams) ? stats.streams : [],
      };
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
      return {
        total_streams: 0,
        active_streams: 0,
        streams: [],
      };
    }
  }

  // Video management
  async getVideos(): Promise<Video[]> {
    try {
      const videos = await this.request<Video[]>('/videos');
      return Array.isArray(videos) ? videos : [];
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      return [];
    }
  }

  async loadAllVideos() {
    return this.request<Array<{ id: string; status: string; name: string }>>('/videos/load_all', {
      method: 'POST',
    });
  }

  // Utility methods for URLs
  getVideoFeedUrl(streamId: string): string {
    return `${API_BASE_URL}/streams/${streamId}/video_feed`;
  }

  getSnapshotUrl(streamId: string): string {
    return `${API_BASE_URL}/streams/${streamId}/snapshot`;
  }
}

export const apiService = new ApiService();