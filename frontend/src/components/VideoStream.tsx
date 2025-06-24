import React, { useState, useRef, useEffect } from 'react';
import { Trash2, AlertCircle, Play, Pause, RotateCcw } from 'lucide-react';
import { Stream, DetectionData } from '../types/api';
import { DetectionOverlay } from './DetectionOverlay';
import { apiService } from '../services/api';

interface VideoStreamProps {
  stream: Stream;
  detection: DetectionData | null;
  onDelete: (streamId: string) => void;
}

export const VideoStream: React.FC<VideoStreamProps> = ({ stream, detection, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setImageError(false);
    if (imgRef.current) {
      // Force refresh by adding timestamp
      const url = apiService.getVideoFeedUrl(stream.id);
      imgRef.current.src = `${url}?t=${Date.now()}`;
    }
  };

  useEffect(() => {
    // Reset states when stream changes
    setIsLoading(true);
    setImageError(false);
  }, [stream.id]);

  const progressPercentage = stream.progress || 0;

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 group hover:border-gray-500 transition-colors">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${stream.running ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white text-sm font-medium truncate max-w-32">
              {stream.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-1 rounded transition-all"
              title="Refresh stream"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(stream.id)}
              className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-1 rounded transition-all"
              title="Delete stream"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detection Overlay */}
      <DetectionOverlay detection={detection} streamId={stream.id} />

      {/* Video Content */}
      <div className="relative aspect-video bg-gray-800">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm font-medium">Stream Unavailable</p>
              <p className="text-gray-400 text-xs mt-1">Failed to load video feed</p>
              <button
                onClick={handleRefresh}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={apiService.getVideoFeedUrl(stream.id)}
            alt={`Stream ${stream.name}`}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {stream.running ? (
                <Play className="w-3 h-3 text-green-400" />
              ) : (
                <Pause className="w-3 h-3 text-red-400" />
              )}
              <span>{stream.fps.toFixed(1)} FPS</span>
            </div>
            
            {stream.is_local_file && stream.progress !== undefined && (
              <div className="flex items-center gap-1">
                <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {stream.detection_enabled && (
              <span className="bg-blue-600 px-2 py-0.5 rounded text-xs">AI</span>
            )}
            {stream.motion_enabled && (
              <span className="bg-purple-600 px-2 py-0.5 rounded text-xs">Motion</span>
            )}
            {stream.is_local_file && (
              <span className="bg-amber-600 px-2 py-0.5 rounded text-xs">Local</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};