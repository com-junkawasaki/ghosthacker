/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/right-sidebar
 * 
 * Right sidebar component with tabs
 */
'use client';

import { Tabs } from '@/components/shared/ui/Tabs';
import { PromptTab } from './PromptTab';
import { PageTab } from './PageTab';
import { ModelBrowser } from './ModelBrowser';
import { AIModel } from '@/lib/ai/modelBrowser';

interface RightSidebarProps {
  activeTab?: string;
  projectId?: string;
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
  onModelSelect?: (model: AIModel) => void;
  onStoryGenerated?: () => void;
  onPanelAdd?: () => void;
  panelAddLoading?: boolean;
}

export function RightSidebar({
  activeTab,
  projectId,
  selectedBubble,
  selectedPanel,
  panelLayers,
  onBubbleSave,
  onBubbleDelete,
  onPanelSettingsChange,
  onLayerToggle,
  onModelSelect,
  onStoryGenerated,
  onPanelAdd,
  panelAddLoading = false,
}: RightSidebarProps) {
  return (
    <div className="w-80 bg-gray-100 border-l border-gray-200 h-full">
      <Tabs
        tabs={[
          {
            id: 'prompt',
            label: 'プロンプト',
            content: <PromptTab projectId={projectId || ''} onStoryGenerated={onStoryGenerated} />,
          },
          {
            id: 'page',
            label: 'ページ',
            content: (
              <PageTab
                selectedBubble={selectedBubble}
                selectedPanel={selectedPanel}
                panelLayers={panelLayers}
                onBubbleSave={onBubbleSave}
                onBubbleDelete={onBubbleDelete}
                onPanelSettingsChange={onPanelSettingsChange}
                onLayerToggle={onLayerToggle}
                onPanelAdd={onPanelAdd}
                panelAddLoading={panelAddLoading}
              />
            ),
          },
          {
            id: 'models',
            label: 'モデル',
            content: <ModelBrowser onModelSelect={onModelSelect} />,
          },
        ]}
        defaultTab={activeTab || 'prompt'}
      />
    </div>
  );
}

