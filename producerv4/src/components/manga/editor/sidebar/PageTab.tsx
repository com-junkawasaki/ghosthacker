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
}

export function PageTab({
  selectedBubble,
  selectedPanel,
  panelLayers,
  onBubbleSave,
  onBubbleDelete,
  onPanelSettingsChange,
  onLayerToggle,
}: PageTabProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
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

