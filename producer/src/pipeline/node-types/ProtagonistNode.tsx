'use client';
import { Handle, Position } from '@reactflow/core';
import type { NodeProps } from './index';

// Merkle DAG Note: lore.protagonist -> prompt-story
export function ProtagonistNode({ data, selected }: NodeProps) {
  const nameValue = data.config?.['name'];
  const roleValue = data.config?.['role'];
  const traitsValue = data.config?.['traits'];
  const name = typeof nameValue === 'string' ? nameValue : undefined;
  const role = typeof roleValue === 'string' ? roleValue : undefined;
  const traits = typeof traitsValue === 'string' ? traitsValue : undefined;

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[180px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-emerald-50`}
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
          <div className="text-sm font-medium">{data.label || 'Protagonist'}</div>
          <div className="text-xs text-gray-500">Character Node</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-700 space-y-1">
        {name && <div>Name: {name}</div>}
        {role && <div>Role: {role}</div>}
        {traits && <div>Traits: {traits}</div>}
      </div>
    </div>
  );
}


