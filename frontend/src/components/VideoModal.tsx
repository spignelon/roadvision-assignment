import React, { useRef, useEffect, useState } from 'react';
import { X, RotateCcw, AlertCircle } from 'lucide-react';
import { Stream, DetectionData } from '../types/api';
import { DetectionOverlay } from './DetectionOverlay';
import { apiService } from '../services/api';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: Stream;
  detection: DetectionData | null;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, stream, detection }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setImageError(false);
    }
  }, [isOpen, stream.id]);

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
      const url = apiService.getVideoFeedUrl(stream.id);
      imgRef.current.src = `${url}?t=${Date.now()}`;
    }
  };

  if (!isOpen) return null;

  const progressPercentage = stream.progress || 0;
  const detections = detection?.detections || [];
  const motions = detection?.motion || [];
  const personCount = detections.filter(d => d.label === 'person').length;
  const motionCount = motions.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-6xl max-h-full bg-gray-900 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stream.running ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-white text-lg font-medium">{stream.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded transition-all"
                title="Refresh stream"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded transition-all"
                title="Close modal"
              >
                <X className="w-5 h-5" />
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-8">
              <div>
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 text-lg font-medium">Stream Unavailable</p>
                <p className="text-gray-400 text-sm mt-2">Failed to load video feed</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
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
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>

        {/* Footer with detailed stats */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            {/* Stream Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-300">Stream Info</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={stream.running ? 'text-green-400' : 'text-red-400'}>
                    {stream.running ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FPS:</span>
                  <span>{stream.fps.toFixed(1)}</span>
                </div>
                {stream.is_local_file && (
                  <div className="flex justify-between">
                    <span>Progress:</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detection Stats */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-300">Detection Stats</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Persons Detected:</span>
                  <span className="text-green-400">{personCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Motion Areas:</span>
                  <span className="text-red-400">{motionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update:</span>
                  <span className="text-gray-300">
                    {detection ? new Date(detection.timestamp * 1000).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-300">Features</h3>
              <div className="flex flex-wrap gap-2">
                {stream.detection_enabled && (
                  <span className="bg-blue-600 px-2 py-1 rounded text-xs">AI Detection</span>
                )}
                {stream.motion_enabled && (
                  <span className="bg-purple-600 px-2 py-1 rounded text-xs">Motion Detection</span>
                )}
                {stream.is_local_file && (
                  <span className="bg-amber-600 px-2 py-1 rounded text-xs">Local File</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};