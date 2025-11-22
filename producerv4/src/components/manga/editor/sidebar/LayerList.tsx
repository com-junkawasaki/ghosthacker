/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/layer-list
 * 
 * Layer list component
 */
'use client';

interface LayerListProps {
  layers: Array<{ id: string; name: string; visible: boolean }>;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

export function LayerList({ layers, onLayerToggle }: LayerListProps) {
  return (
    <div className="space-y-1">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded cursor-pointer"
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

