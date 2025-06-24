import React, { useState } from 'react';
import { Stream, DetectionData } from '../types/api';
import { VideoStream } from './VideoStream';
import { VideoModal } from './VideoModal';

interface StreamGridProps {
  streams: Stream[];
  detections: Map<string, DetectionData>;
  onDeleteStream: (streamId: string) => void;
}

export const StreamGrid: React.FC<StreamGridProps> = ({ streams, detections, onDeleteStream }) => {
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);

  if (streams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">No streams available</p>
          <p className="text-gray-500 text-sm">Add a stream to get started</p>
        </div>
      </div>
    );
  }

  // Calculate grid layout based on number of streams
  const getGridLayout = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count <= 9) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    if (count <= 12) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
  };

  return (
    <>
      <div className={`grid gap-6 ${getGridLayout(streams.length)}`}>
        {streams.map((stream) => (
          <VideoStream
            key={stream.id}
            stream={stream}
            detection={detections.get(stream.id) || null}
            onDelete={onDeleteStream}
            onOpenModal={setSelectedStream}
          />
        ))}
      </div>

      {/* Video Modal */}
      {selectedStream && (
        <VideoModal
          isOpen={!!selectedStream}
          onClose={() => setSelectedStream(null)}
          stream={selectedStream}
          detection={detections.get(selectedStream.id) || null}
        />
      )}
    </>
  );
};