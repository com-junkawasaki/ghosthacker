/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/layer-list
 * 
 * Layer list component with panel grouping and expand/collapse
 */
'use client';

import { useState } from 'react';
import type { PanelLayerGroup, PanelLayer } from '@/lib/konva/layerExtractor';

interface LayerListProps {
  layerGroups?: PanelLayerGroup[];
  layers?: Array<{ id: string; name: string; visible: boolean }>; // Backward compatibility
  onLayerToggle?: (layerId: string, visible: boolean) => void;
}

/**
 * Get icon for layer type
 */
function getLayerIcon(type: PanelLayer['type']): string {
  switch (type) {
    case 'image':
      return '🖼️';
    case 'speech_bubble':
      return '💬';
    case 'text':
      return '📝';
    case 'drawing':
      return '✏️';
    case 'shape':
      return '⬜';
    case 'panel':
      return '📦';
    case 'dialogue':
      return '💭';
    default:
      return '📄';
  }
}

export function LayerList({ layerGroups, layers, onLayerToggle }: LayerListProps) {
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Handle panel expansion toggle
  const togglePanel = (panelId: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  };

  // If layerGroups is provided, use panel-grouped view
  if (layerGroups && layerGroups.length > 0) {
    return (
      <div className="space-y-1">
        {layerGroups.map((group) => {
          const isExpanded = expandedPanels.has(group.panelId);
          const hasLayers = group.layers.length > 0;

          return (
            <div key={group.panelId} className="border-b border-gray-200 last:border-b-0 pb-1">
              {/* Panel header */}
              <div
                onClick={() => togglePanel(group.panelId)}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  selectedLayerId === group.panelId
                    ? 'bg-blue-100 hover:bg-blue-200'
                    : 'hover:bg-gray-200'
                }`}
              >
                <span
                  className={`text-xs text-gray-600 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                >
                  {'>'}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-700">
                  {group.panelName}
                </span>
                {hasLayers && (
                  <span className="text-xs text-gray-500">
                    {group.layers.length}
                  </span>
                )}
              </div>

              {/* Panel layers */}
              {isExpanded && hasLayers && (
                <div className="ml-4 mt-1 space-y-1">
                  {group.layers.map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id === selectedLayerId ? null : layer.id)}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        selectedLayerId === layer.id
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xs text-gray-400">{getLayerIcon(layer.type)}</span>
                      <span className="flex-1 text-sm text-gray-700">{layer.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerToggle?.(layer.id, !layer.visible);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title={layer.visible ? '非表示にする' : '表示する'}
                      >
                        {layer.visible ? '👁' : '👁‍🗨'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback to flat list for backward compatibility
  if (layers && layers.length > 0) {
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

  // Empty state
  return (
    <div className="text-sm text-gray-500 p-2 text-center">
      レイヤーがありません
    </div>
  );
}

