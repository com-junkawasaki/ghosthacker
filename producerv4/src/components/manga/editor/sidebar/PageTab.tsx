/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/page-tab
 * 
 * Page tab component
 */
'use client';

import { SpeechBubbleManager } from './SpeechBubbleManager';

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
  onBubbleSave?: (bubble: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => void;
  onBubbleDelete?: (id: string) => void;
}

export function PageTab({
  selectedBubble,
  onBubbleSave,
  onBubbleDelete,
}: PageTabProps) {
  return (
    <div className="h-full overflow-y-auto">
      {selectedBubble ? (
        <SpeechBubbleManager
          selectedBubble={selectedBubble}
          onSave={onBubbleSave}
          onDelete={onBubbleDelete}
        />
      ) : (
        <div className="p-4">
          <p className="text-sm text-gray-600">吹き出しを選択して編集</p>
        </div>
      )}
    </div>
  );
}

