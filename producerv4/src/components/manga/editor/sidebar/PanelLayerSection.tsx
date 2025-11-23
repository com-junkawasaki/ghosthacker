/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/panel-layer-section
 * 
 * Panel layer section component for PageTab
 */
'use client';

import { match } from 'ts-pattern';
import type { LayerType } from '@/types/manga';

interface PanelLayer {
  id: string;
  name: string;
  type: LayerType;
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
        { id: 'image', name: 'Image', type: 'image' as LayerType, visible: true },
        { id: 'dialogue', name: 'Dialogue', type: 'dialogue' as LayerType, visible: true },
      ];

  const renderLayerIcon = (layerType: LayerType) => {
    return match(layerType)
      .with('image', () => '🖼️')
      .with('dialogue', () => '💬')
      .with('drawing', () => '✏️')
      .with('shape', () => '⬜')
      .with('text', () => '📝')
      .exhaustive();
  };

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
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLayerToggle?.(layer.id, !layer.visible);
              }}
              className="text-gray-400 hover:text-gray-600"
              title={layer.visible ? '非表示にする' : '表示する'}
            >
              {layer.visible ? '👁' : '👁‍🗨'}
            </button>
            <span className="flex-1 text-sm text-gray-700 flex items-center gap-2">
              <span>{renderLayerIcon(layer.type)}</span>
              <span>{layer.name}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

