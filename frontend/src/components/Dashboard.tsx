import React, { useState } from 'react';
import { Plus, RefreshCw, Monitor, Settings } from 'lucide-react';
import { useStreams } from '../hooks/useStreams';
import { StreamGrid } from './StreamGrid';
import { SystemStats } from './SystemStats';
import { AddStreamModal } from './AddStreamModal';

export const Dashboard: React.FC = () => {
  const {
    streams,
    detections,
    systemStats,
    loading,
    error,
    addStream,
    deleteStream,
    loadAllVideos,
    refetch,
  } = useStreams();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStats, setShowStats] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Video Management System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">RoadVision VMS</h1>
              <p className="text-gray-400 text-sm">Video Management System with AI Detection</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            <button
              onClick={refetch}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Stream
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-300">
              {systemStats?.active_streams || 0} Active Streams
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-gray-300">
              {systemStats?.total_streams || 0} Total Streams
            </span>
          </div>
          {error && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-red-400">{error}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-screen-2xl mx-auto">
          {showStats && (
            <div className="mb-6">
              <SystemStats stats={systemStats} />
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Live Video Streams</h2>
              <div className="text-sm text-gray-400">
                {streams.length} stream{streams.length !== 1 ? 's' : ''} configured
              </div>
            </div>

            <StreamGrid
              streams={streams}
              detections={detections}
              onDeleteStream={deleteStream}
              useSnapshots={true} // Use snapshot polling for grid
            />
          </div>
        </div>
      </main>

      {/* Add Stream Modal */}
      <AddStreamModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddStream={addStream}
        onLoadAllVideos={loadAllVideos}
      />
    </div>
  );
};