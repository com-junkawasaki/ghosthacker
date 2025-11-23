/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/layer-list
 * 
 * Layer list component
 */
'use client';

import { useState } from 'react';

interface LayerListProps {
  layers: Array<{ id: string; name: string; visible: boolean }>;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

export function LayerList({ layers, onLayerToggle }: LayerListProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {layers.map((layer) => (
        <div
          key={layer.id}
          onClick={() => setSelectedLayerId(layer.id === selectedLayerId ? null : layer.id)}
          className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
            selectedLayerId === layer.id
              ? 'bg-blue-100 hover:bg-blue-200'
              : 'hover:bg-gray-200'
          }`}
        >
          <span className="text-xs text-gray-600">{'>'}</span>
          <span className="flex-1 text-sm text-gray-700">{layer.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLayerToggle?.(layer.id, !layer.visible);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            {layer.visible ? '👁' : '👁‍🗨'}
          </button>
        </div>
      ))}
    </div>
  );
}

