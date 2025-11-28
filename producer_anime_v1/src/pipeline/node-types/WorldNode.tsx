'use client';
import { Handle, Position } from '@reactflow/core';
import type { NodeProps } from './index';

// Merkle DAG Note: lore.world -> prompt-story & image-gen
export function WorldNode({ data, selected }: NodeProps) {
  const settingValue = data.config?.['setting'];
  const eraValue = data.config?.['era'];
  const rulesValue = data.config?.['rules'];
  const setting = typeof settingValue === 'string' ? settingValue : undefined;
  const era = typeof eraValue === 'string' ? eraValue : undefined;
  const rules = typeof rulesValue === 'string' ? rulesValue : undefined;

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[180px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-indigo-50`}
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
          <div className="text-sm font-medium">{data.label || 'World'}</div>
          <div className="text-xs text-gray-500">Worldbuilding</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-700 space-y-1">
        {setting && <div>Setting: {setting}</div>}
        {era && <div>Era: {era}</div>}
        {rules && <div>Rules: {rules}</div>}
      </div>
    </div>
  );
}


