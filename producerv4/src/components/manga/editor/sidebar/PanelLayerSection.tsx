/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-layer-section
 * 
 * Panel layer section component for PageTab
 */
'use client';

interface PanelLayer {
  id: string;
  name: string;
  type: 'image' | 'dialogue';
  visible: boolean;
}

interface PanelLayerSectionProps {
  layers?: PanelLayer[];
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

export function PanelLayerSection({ layers = [], onLayerToggle }: PanelLayerSectionProps) {
  // Default layers if none provided
  const defaultLayers: PanelLayer[] = layers.length > 0 
    ? layers 
    : [
        { id: 'image', name: 'Image', type: 'image', visible: true },
        { id: 'dialogue', name: 'Dialogue', type: 'dialogue', visible: true },
      ];

  return (
    <div className="border-b border-gray-200 pb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-2">パネルレイヤー</h3>
      <div className="space-y-1">
        {defaultLayers.map((layer) => (
          <div
            key={layer.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLayerToggle?.(layer.id, !layer.visible);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              {layer.visible ? '👁' : '👁‍🗨'}
            </button>
            <span className="flex-1 text-sm text-gray-700">{layer.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

