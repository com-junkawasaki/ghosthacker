'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import { NodeData } from './index';

export function WebtoonExport({ data, selected }: NodeProps<NodeData>) {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-emerald-50`}
    >
      <Handle type="target" position={Position.Left} />
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
          <div className="text-xs text-gray-500">Webtoon Export</div>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {data.config?.format && (
          <span className="text-xs bg-emerald-200 px-2 py-1 rounded">
            {data.config.format}
          </span>
        )}
      </div>

      {data.outputs?.episodePath && (
        <div className="mt-2 text-xs text-gray-600">
          Episode: {String(data.outputs.episodePath)}
        </div>
      )}

      {data.outputs?.downloadUrl && (
        <div className="mt-2">
          <a
            href={String(data.outputs.downloadUrl)}
            className="text-xs bg-emerald-200 hover:bg-emerald-300 px-2 py-1 rounded inline-block"
            download
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}
