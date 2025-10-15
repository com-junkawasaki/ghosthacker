'use client';
import { Handle, Position } from '@reactflow/core';
import type { NodeProps } from './index';

// Merkle DAG Note: lore.backstory -> prompt-story
export function BackstoryNode({ data, selected }: NodeProps) {
  const originValue = data.config?.['origin'];
  const motivationValue = data.config?.['motivation'];
  const conflictValue = data.config?.['conflict'];
  const origin = typeof originValue === 'string' ? originValue : undefined;
  const motivation = typeof motivationValue === 'string' ? motivationValue : undefined;
  const conflict = typeof conflictValue === 'string' ? conflictValue : undefined;

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[180px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-amber-50`}
    >
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
          <div className="text-sm font-medium">{data.label || 'Backstory'}</div>
          <div className="text-xs text-gray-500">Narrative Background</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-700 space-y-1">
        {origin && <div>Origin: {origin}</div>}
        {motivation && <div>Motivation: {motivation}</div>}
        {conflict && <div>Conflict: {conflict}</div>}
      </div>
    </div>
  );
}


