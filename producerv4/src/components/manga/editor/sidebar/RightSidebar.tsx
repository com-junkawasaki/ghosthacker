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
  onBubbleSave?: (bubble: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => void;
  onBubbleDelete?: (id: string) => void;
  onModelSelect?: (model: AIModel) => void;
  onStoryGenerated?: () => void;
}

export function RightSidebar({
  activeTab,
  projectId,
  selectedBubble,
  onBubbleSave,
  onBubbleDelete,
  onModelSelect,
  onStoryGenerated,
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
                onBubbleSave={onBubbleSave}
                onBubbleDelete={onBubbleDelete}
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

