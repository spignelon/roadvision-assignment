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
  detections,
  onDeleteStream,
  useSnapshots = false,
}) => {
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [openModalStreamId, setOpenModalStreamId] = useState<string | null>(null);
  const pollingRef = useRef<{ active: boolean }>({ active: true });

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
        .filter((id) => id !== openModalStreamId); // Don't poll for modal-open stream

      const next = async () => {
        if (!isMounted || !pollingRef.current.active) return;
        while (inFlight < concurrency && queue.length > 0) {
          const streamId = queue.shift();
          if (!streamId) continue;
          inFlight++;
          // Add cache buster
          const url = apiService.getSnapshotUrl(streamId) + '?t=' + Date.now();
          try {
            // Fetch as blob to avoid caching issues
            const resp = await fetch(url, { cache: 'no-store' });
            if (resp.ok) {
              const blob = await resp.blob();
              const objectUrl = URL.createObjectURL(blob);
              setSnapshots((prev) => {
                // Revoke previous object URL to avoid memory leak
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

      // Start initial batch
      for (let i = 0; i < concurrency; i++) {
        next();
      }
      // Schedule next poll
      timer = setTimeout(pollSnapshots, 1000);
    };

    pollSnapshots();

    return () => {
      isMounted = false;
      pollingRef.current.active = false;
      if (timer) clearTimeout(timer);
      // Cleanup object URLs
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

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-6">
        {streams.map((stream) => {
          const detection = detections?.[stream.id];
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
                {detection && (
                  <div className="flex gap-4 mt-2 text-xs text-gray-300">
                    <span>
                      <span className="font-bold text-green-400">{detection.detections?.length ?? 0}</span> detected
                    </span>
                    <span>
                      <span className="font-bold text-red-400">{detection.motion?.length ?? 0}</span> motion
                    </span>
                  </div>
                )}
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
      <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
        <button
          className="absolute top-2 right-2 text-white bg-red-600 hover:bg-red-700 rounded px-3 py-1"
          onClick={onClose}
        >
          Close
        </button>
        <div className="mb-4 text-lg font-semibold">{stream.name}</div>
        <div className="w-full aspect-video bg-black rounded overflow-hidden">
          <img
            src={apiService.getVideoFeedUrl(stream.id)}
            alt={stream.name}
            className="w-full h-full object-cover"
            style={{ minHeight: 320 }}
            draggable={false}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400">{stream.url}</div>
      </div>
    </div>
  );
};