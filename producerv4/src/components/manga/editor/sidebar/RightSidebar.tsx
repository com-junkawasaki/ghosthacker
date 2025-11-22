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

interface RightSidebarProps {
  activeTab?: string;
}

export function RightSidebar({ activeTab }: RightSidebarProps) {
  return (
    <div className="w-80 bg-gray-100 border-l border-gray-200 h-full">
      <Tabs
        tabs={[
          {
            id: 'prompt',
            label: 'プロンプト',
            content: <PromptTab />,
          },
          {
            id: 'page',
            label: 'ページ',
            content: <PageTab />,
          },
        ]}
        defaultTab={activeTab || 'prompt'}
      />
    </div>
  );
}

