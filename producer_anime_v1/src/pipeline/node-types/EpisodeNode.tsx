'use client';
import { Handle, Position } from '@reactflow/core';
import type { NodeProps } from './index';

/**
 * EpisodeNode - Episode ノード
 * 
 * Episode を Canvas 上でノードとして表現
 * EpisodeNode は episode の内容を JSON-LD で管理
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */
export function EpisodeNode({ data, selected }: NodeProps) {
  const episodeId = (data as { episodeId?: string }).episodeId;
  const episodeTitle = data.config?.['title'] || data.label || 'Episode';
  const episodeNumber = data.config?.['number'];

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[180px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-blue-50`}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="flex items-center">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            data.status === 'completed'
              ? 'bg-green-500'
              : data.status === 'running'
              ? 'bg-yellow-500'
              : data.status === 'error'
              ? 'bg-red-500'
              : 'bg-gray-400'
          }`}
        />
        <div>
          <div className="text-sm font-medium">{episodeTitle}</div>
          <div className="text-xs text-gray-500">Episode Node</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-700 space-y-1">
        {episodeId && <div>ID: {episodeId}</div>}
        {episodeNumber && <div>Episode #{episodeNumber}</div>}
      </div>
    </div>
  );
}

