import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/api';
import { Stream, DetectionData } from '../types/api';
import { Trash2 } from 'lucide-react';

interface StreamGridProps {
  streams: Stream[];
  detections: Record<string, DetectionData>;
  onDeleteStream: (id: string) => void;
  useSnapshots?: boolean;
}

export const StreamGrid: React.FC<StreamGridProps> = ({
  streams,
  detections: propDetections,
  onDeleteStream,
  useSnapshots = false,
}) => {
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [openModalStreamId, setOpenModalStreamId] = useState<string | null>(null);
  const pollingRef = useRef<{ active: boolean }>({ active: true });

  // Local state for detections
  const [detections, setDetections] = useState<Record<string, DetectionData>>({});

  // Queue-based polling for snapshots
  useEffect(() => {
    if (!useSnapshots) return;
    pollingRef.current.active = true;

    let isMounted = true;
    let queue: string[] = [];
    let inFlight = 0;
    const concurrency = 2;
    let timer: NodeJS.Timeout | null = null;

    const pollSnapshots = () => {
      if (!isMounted || !pollingRef.current.active) return;
      queue = streams
        .map((s) => s.id)
        .filter((id) => id !== openModalStreamId);

      const next = async () => {
        if (!isMounted || !pollingRef.current.active) return;
        while (inFlight < concurrency && queue.length > 0) {
          const streamId = queue.shift();
          if (!streamId) continue;
          inFlight++;
          const url = apiService.getSnapshotUrl(streamId) + '?t=' + Date.now();
          try {
            const resp = await fetch(url, { cache: 'no-store' });
            if (resp.ok) {
              const blob = await resp.blob();
              const objectUrl = URL.createObjectURL(blob);
              setSnapshots((prev) => {
                if (prev[streamId]) URL.revokeObjectURL(prev[streamId]);
                return { ...prev, [streamId]: objectUrl };
              });
            }
          } catch {
            // ignore errors
          } finally {
            inFlight--;
            if (queue.length > 0) {
              next();
            }
          }
        }
      };

      for (let i = 0; i < concurrency; i++) {
        next();
      }
      timer = setTimeout(pollSnapshots, 1000);
    };

    pollSnapshots();

    return () => {
      isMounted = false;
      pollingRef.current.active = false;
      if (timer) clearTimeout(timer);
      Object.values(snapshots).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line
  }, [streams, openModalStreamId, useSnapshots]);

  // When modal is open, stop polling for that stream
  const handleOpenModal = (streamId: string) => {
    setOpenModalStreamId(streamId);
    pollingRef.current.active = false;
  };
  const handleCloseModal = () => {
    setOpenModalStreamId(null);
    pollingRef.current.active = true;
  };

  // Fetch detection data for each stream periodically
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const fetchDetections = async () => {
      if (!isMounted) return;
      await Promise.all(
        streams.map(async (stream) => {
          try {
            const detection = await apiService.getDetections(stream.id);
            if (isMounted) {
              setDetections((prev) => ({
                ...prev,
                [stream.id]: detection,
              }));
            }
          } catch {
            // ignore errors
          }
        })
      );
      timer = setTimeout(fetchDetections, 2000);
    };

    fetchDetections();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line
  }, [streams]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6">
        {streams.map((stream) => {
          // Use local detections state
          const detection = detections[stream.id];
          return (
            <div key={stream.id} className="bg-gray-800 rounded-lg shadow p-4 flex flex-col relative group">
              {/* Small red delete icon button in top-right */}
              <button
                className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-700 rounded-full p-1 transition-opacity opacity-80 group-hover:opacity-100"
                title="Delete stream"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStream(stream.id);
                }}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
              <div
                className="relative w-full aspect-video bg-black rounded mb-2 overflow-hidden cursor-pointer"
                onClick={() => handleOpenModal(stream.id)}
              >
                {useSnapshots ? (
                  <img
                    src={snapshots[stream.id] || apiService.getSnapshotUrl(stream.id)}
                    alt={stream.name}
                    className="w-full h-full object-cover"
                    style={{ minHeight: 160 }}
                    draggable={false}
                  />
                ) : (
                  <img
                    src={apiService.getVideoFeedUrl(stream.id)}
                    alt={stream.name}
                    className="w-full h-full object-cover"
                    style={{ minHeight: 160 }}
                    draggable={false}
                  />
                )}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-xs px-2 py-1 rounded text-white">
                  Click to view live
                </div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{stream.name}</div>
                <div className="text-xs text-gray-400 truncate">{stream.url}</div>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-green-400">{stream.running ? 'Running' : 'Stopped'}</span>
                  <span className="text-blue-400">FPS: {stream.fps.toFixed(1)}</span>
                </div>
                {/* Analytics section */}
                <div className="flex gap-4 mt-2 text-xs text-gray-300">
                  <span>
                    <span className="font-bold text-green-400">
                      {Array.isArray(detection?.detections) ? detection.detections.length : 0}
                    </span> person
                  </span>
                  <span>
                    <span className="font-bold text-red-400">
                      {Array.isArray(detection?.motion) ? detection.motion.length : 0}
                    </span> motion
                  </span>
                  <span>
                    <span className="font-bold text-yellow-400">
                      {detection?.timestamp
                        ? new Date(
                            (detection.timestamp > 1e12
                              ? detection.timestamp
                              : detection.timestamp * 1000)
                          ).toLocaleTimeString()
                        : '--'}
                    </span>{' '}
                    last update
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Modal for live video feed */}
      {openModalStreamId && (
        <StreamModal
          stream={streams.find((s) => s.id === openModalStreamId)!}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

// Modal component for live video feed
const StreamModal: React.FC<{ stream: Stream; onClose: () => void }> = ({
  stream,
  onClose,
}) => {
  // When modal is open, only show video_feed, not snapshot
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-5xl relative">
        <button
          className="absolute top-2 right-2 text-white bg-red-600 hover:bg-red-700 rounded px-3 py-1"
          onClick={onClose}
        >
          Close
        </button>
        <div className="mb-4 text-lg font-semibold">{stream.name}</div>
        <div className="w-full aspect-video bg-black rounded overflow-hidden flex items-center justify-center" style={{ minHeight: 480 }}>
          <img
            src={apiService.getVideoFeedUrl(stream.id)}
            alt={stream.name}
            className="w-full h-full object-contain"
            style={{ minHeight: 480, maxHeight: 600 }}
            draggable={false}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400">{stream.url}</div>
      </div>
    </div>
  );
};