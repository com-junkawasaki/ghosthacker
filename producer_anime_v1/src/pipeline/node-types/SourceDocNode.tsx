'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import { NodeData } from './index';

export function SourceDocNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-white`}
    >
      <Handle type="source" position={Position.Right} />

      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${
          data.status === 'completed' ? 'bg-green-500' :
          data.status === 'running' ? 'bg-yellow-500' :
          data.status === 'error' ? 'bg-red-500' :
          'bg-gray-400'
        }`} />
        <div>
          <div className="text-sm font-medium">{data.label}</div>
          <div className="text-xs text-gray-500">Source Document</div>
        </div>
      </div>

      {data.config?.episodeId && (
        <div className="mt-2 text-xs text-gray-600">
          Episode: {data.config.episodeId}
        </div>
      )}
    </div>
  );
}
