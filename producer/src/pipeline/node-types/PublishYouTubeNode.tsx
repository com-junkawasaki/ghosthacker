'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import { NodeData } from './index';

export function PublishYouTubeNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-red-50`}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${
          data.status === 'completed' ? 'bg-green-500' :
          data.status === 'running' ? 'bg-yellow-500' :
          data.status === 'error' ? 'bg-red-500' :
          'bg-gray-400'
        }`} />
        <div>
          <div className="text-sm font-medium">{data.label}</div>
          <div className="text-xs text-gray-500">YouTube Upload</div>
        </div>
      </div>

      {data.outputs?.videoId && (
        <div className="mt-2 text-xs text-gray-600">
          Video ID: {String(data.outputs.videoId)}
        </div>
      )}

      {data.outputs?.uploadUrl && (
        <div className="mt-2">
          <a
            href={String(data.outputs.uploadUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-red-200 hover:bg-red-300 px-2 py-1 rounded inline-block"
          >
            View on YouTube
          </a>
        </div>
      )}

      {data.outputs?.exportPath && (
        <div className="mt-2 text-xs text-gray-600">
          Export: {String(data.outputs.exportPath)}
        </div>
      )}
    </div>
  );
}
