import React, { useState } from 'react';
import { X, Plus, Camera, File } from 'lucide-react';

interface AddStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStream: (url: string, id?: string) => Promise<boolean>;
  onLoadAllVideos: () => Promise<boolean>;
}

export const AddStreamModal: React.FC<AddStreamModalProps> = ({
  isOpen,
  onClose,
  onAddStream,
  onLoadAllVideos,
}) => {
  const [url, setUrl] = useState('');
  const [streamId, setStreamId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    const success = await onAddStream(url.trim(), streamId.trim() || undefined);
    setLoading(false);

    if (success) {
      setUrl('');
      setStreamId('');
      onClose();
    }
  };

  const handleLoadAllVideos = async () => {
    setLoading(true);
    const success = await onLoadAllVideos();
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  const presetUrls = [
    { label: 'Webcam (Default)', value: '0' },
    { label: 'Webcam (USB)', value: '1' },
    { label: 'RTSP Example', value: 'rtsp://example.com/stream' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Add New Stream</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Stream URL or Source
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter RTSP URL, webcam index (0,1,2...), or file path"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Stream ID (Optional)
            </label>
            <input
              type="text"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              placeholder="Custom stream identifier"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-1 gap-2">
              {presetUrls.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setUrl(preset.value)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-left hover:bg-gray-700 transition-colors"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-white text-sm">{preset.label}</p>
                    <p className="text-gray-400 text-xs">{preset.value}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adding...' : 'Add Stream'}
            </button>
            <button
              type="button"
              onClick={handleLoadAllVideos}
              disabled={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <File className="w-4 h-4" />
              {loading ? 'Loading...' : 'Load All Videos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};