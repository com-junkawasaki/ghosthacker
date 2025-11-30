/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/page-tab
 * 
 * Page tab component
 */
'use client';

import { SpeechBubbleManager } from './SpeechBubbleManager';
import { PanelLayerSection } from './PanelLayerSection';
import { PanelSettingsSection } from './PanelSettingsSection';

interface PageTabProps {
  selectedBubble?: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selectedPanel?: {
    id: string;
    order?: number;
    hideBorder?: boolean;
    ignoreNeighborPanels?: boolean;
  };
  panelLayers?: Array<{
    id: string;
    name: string;
    type: 'image' | 'dialogue';
    visible: boolean;
  }>;
  onBubbleSave?: (bubble: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => void;
  onBubbleDelete?: (id: string) => void;
  onPanelSettingsChange?: (settings: {
    order?: number;
    hideBorder?: boolean;
    ignoreNeighborPanels?: boolean;
  }) => void;
  onLayerToggle?: (layerId: string, visible: boolean) => void;
  onPanelAdd?: () => void;
  panelAddLoading?: boolean;
}

export function PageTab({
  selectedBubble,
  selectedPanel,
  panelLayers,
  onBubbleSave,
  onBubbleDelete,
  onPanelSettingsChange,
  onLayerToggle,
  onPanelAdd,
  panelAddLoading = false,
}: PageTabProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {onPanelAdd && (
        <div className="border-b border-gray-200 pb-4">
          <button
            onClick={onPanelAdd}
            disabled={panelAddLoading}
            className="w-full px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {panelAddLoading ? '追加中...' : '+ コマ追加'}
          </button>
        </div>
      )}
      <PanelLayerSection layers={panelLayers} onLayerToggle={onLayerToggle} />
      <PanelSettingsSection 
        selectedPanel={selectedPanel} 
        onSettingsChange={onPanelSettingsChange}
      />
      {selectedBubble && (
        <div className="border-t border-gray-200 pt-4">
          <SpeechBubbleManager
            selectedBubble={selectedBubble}
            onSave={onBubbleSave}
            onDelete={onBubbleDelete}
          />
        </div>
      )}
    </div>
  );
}

