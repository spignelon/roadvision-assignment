import { useState, useEffect, useCallback } from 'react';
import { Stream, DetectionData, SystemStats } from '../types/api';
import { apiService } from '../services/api';

export const useStreams = () => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [detections, setDetections] = useState<Map<string, DetectionData>>(new Map());
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    try {
      const streamData = await apiService.getStreams();
      setStreams(streamData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch streams');
      console.error('Error fetching streams:', err);
    }
  }, []);

  const fetchDetections = useCallback(async () => {
    if (streams.length === 0) return;

    const detectionPromises = streams.map(async (stream) => {
      if (stream.running) {
        try {
          const detection = await apiService.getDetections(stream.id);
          return { streamId: stream.id, detection };
        } catch (err) {
          console.error(`Error fetching detections for ${stream.id}:`, err);
          return null;
        }
      }
      return null;
    });

    const results = await Promise.all(detectionPromises);
    const newDetections = new Map<string, DetectionData>();
    
    results.forEach((result) => {
      if (result && result.detection) {
        // Ensure detection data has the required structure
        const safeDetection: DetectionData = {
          timestamp: result.detection.timestamp || Date.now() / 1000,
          detections: Array.isArray(result.detection.detections) ? result.detection.detections : [],
          motion: Array.isArray(result.detection.motion) ? result.detection.motion : [],
        };
        newDetections.set(result.streamId, safeDetection);
      }
    });

    setDetections(newDetections);
  }, [streams]);

  const fetchSystemStats = useCallback(async () => {
    try {
      const stats = await apiService.getSystemStats();
      setSystemStats(stats);
    } catch (err) {
      console.error('Error fetching system stats:', err);
    }
  }, []);

  const addStream = useCallback(async (url: string, id?: string) => {
    try {
      await apiService.addStream(url, id);
      await fetchStreams();
      return true;
    } catch (err) {
      setError('Failed to add stream');
      console.error('Error adding stream:', err);
      return false;
    }
  }, [fetchStreams]);

  const deleteStream = useCallback(async (streamId: string) => {
    try {
      await apiService.deleteStream(streamId);
      await fetchStreams();
      // Remove detection data for deleted stream
      setDetections(prev => {
        const newDetections = new Map(prev);
        newDetections.delete(streamId);
        return newDetections;
      });
      return true;
    } catch (err) {
      setError('Failed to delete stream');
      console.error('Error deleting stream:', err);
      return false;
    }
  }, [fetchStreams]);

  const loadAllVideos = useCallback(async () => {
    try {
      await apiService.loadAllVideos();
      await fetchStreams();
      return true;
    } catch (err) {
      setError('Failed to load videos');
      console.error('Error loading videos:', err);
      return false;
    }
  }, [fetchStreams]);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([fetchStreams(), fetchSystemStats()]);
      setLoading(false);
    };

    initializeData();
  }, [fetchStreams, fetchSystemStats]);

  useEffect(() => {
    if (streams.length > 0) {
      fetchDetections();
    }
  }, [fetchDetections]);

  // Set up polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStreams();
      fetchDetections();
      fetchSystemStats();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [fetchStreams, fetchDetections, fetchSystemStats]);

  return {
    streams,
    detections,
    systemStats,
    loading,
    error,
    addStream,
    deleteStream,
    loadAllVideos,
    refetch: fetchStreams,
  };
};