import React from 'react';
import { DetectionData } from '../types/api';
import { Eye, Activity } from 'lucide-react';

interface DetectionOverlayProps {
  detection: DetectionData | null;
  streamId: string;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ detection, streamId }) => {
  // Early return if no detection data or if detection arrays are not available
  if (!detection || !detection.detections || !detection.motion) {
    return null;
  }

  const detections = detection.detections || [];
  const motions = detection.motion || [];
  
  // Only show overlay if there are actual detections or motion
  if (detections.length === 0 && motions.length === 0) {
    return null;
  }

  const personCount = detections.filter(d => d.label === 'person').length;
  const motionCount = motions.length;

  return (
    <div className="absolute top-2 left-2 right-2 z-10">
      <div className="bg-black bg-opacity-75 rounded-lg p-2 backdrop-blur-sm">
        <div className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-3">
            {personCount > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-green-400" />
                <span>{personCount} Person{personCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {motionCount > 0 && (
              <div className="flex items-center gap-1">
                <Activity className="w-4 h-4 text-red-400" />
                <span>{motionCount} Motion</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-300">
            {new Date(detection.timestamp * 1000).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};