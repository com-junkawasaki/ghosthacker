/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/speech-bubble-manager
 * 
 * Speech bubble manager component for managing speech bubbles
 */
'use client';

import { SpeechBubbleEditor } from './SpeechBubbleEditor';

interface SpeechBubbleManagerProps {
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
  onSave?: (bubble: {
    id: string;
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => void;
  onDelete?: (id: string) => void;
}

export function SpeechBubbleManager({
  selectedBubble,
  onSave,
  onDelete,
}: SpeechBubbleManagerProps) {
  return (
    <div className="p-4">
      <h2 className="font-semibold text-sm text-gray-700 mb-4">吹き出し編集</h2>
      <SpeechBubbleEditor
        bubble={selectedBubble}
        onSave={(updates) => {
          if (selectedBubble) {
            onSave?.({ ...selectedBubble, ...updates });
          }
        }}
        onDelete={() => {
          if (selectedBubble) {
            onDelete?.(selectedBubble.id);
          }
        }}
      />
    </div>
  );
}

