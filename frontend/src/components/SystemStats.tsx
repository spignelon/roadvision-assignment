import React from 'react';
import { Activity, Monitor, Play, Pause } from 'lucide-react';
import { SystemStats as SystemStatsType } from '../types/api';

interface SystemStatsProps {
  stats: SystemStatsType | null;
}

export const SystemStats: React.FC<SystemStatsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">System Statistics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.total_streams}</p>
              <p className="text-sm text-gray-400">Total Streams</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-3">
            <Play className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.active_streams}</p>
              <p className="text-sm text-gray-400">Active Streams</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-3">
            <Pause className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.total_streams - stats.active_streams}</p>
              <p className="text-sm text-gray-400">Inactive Streams</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-white mb-3">Stream Status</h3>
        {stats.streams.map((stream) => (
          <div key={stream.id} className="flex items-center justify-between bg-gray-900 rounded-lg p-3 border border-gray-600">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stream.running ? 'bg-green-400' : 'bg-red-400'}`} />
              <div>
                <p className="text-white font-medium">{stream.name}</p>
                <p className="text-sm text-gray-400">{stream.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white">{stream.fps.toFixed(1)} FPS</p>
              <div className="flex gap-2 mt-1">
                {stream.detection_enabled && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Detection</span>
                )}
                {stream.motion_enabled && (
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">Motion</span>
                )}
                {stream.is_local_file && (
                  <span className="px-2 py-1 bg-amber-600 text-white text-xs rounded">Local</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};