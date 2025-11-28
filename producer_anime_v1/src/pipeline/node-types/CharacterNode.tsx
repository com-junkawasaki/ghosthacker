'use client';
import { Handle, Position } from '@reactflow/core';
import type { NodeProps } from './index';

/**
 * CharacterNode - 登場人物ノード
 * 
 * 登場人物を Canvas 上でノードとして表現
 * CharacterNode は登場人物の context（バックストーリー、特性、関係性）を JSON-LD で管理
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */
export function CharacterNode({ data, selected }: NodeProps) {
  const characterId = (data as { characterId?: string }).characterId;
  const characterName = data.config?.['name'] || data.label || 'Character';
  const role = data.config?.['role'];
  const traits = data.config?.['traits'];

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[180px] ${
        selected ? 'border-blue-500' : 'border-gray-200'
      } bg-purple-50`}
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
          <div className="text-sm font-medium">{characterName}</div>
          <div className="text-xs text-gray-500">Character Node</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-700 space-y-1">
        {characterId && <div>ID: {characterId}</div>}
        {role && <div>Role: {role}</div>}
        {traits && <div>Traits: {traits}</div>}
      </div>
    </div>
  );
}

