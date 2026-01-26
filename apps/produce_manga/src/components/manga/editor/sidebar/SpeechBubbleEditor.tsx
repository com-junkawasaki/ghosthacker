/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/speech-bubble-editor
 * 
 * Speech bubble editor component
 */
'use client';

import { useState } from 'react';

interface SpeechBubbleEditorProps {
  bubble?: {
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
    text: string;
    speaker?: string;
    bubbleType: 'speech' | 'thought' | 'shout';
  }) => void;
  onDelete?: () => void;
}

export function SpeechBubbleEditor({ bubble, onSave, onDelete }: SpeechBubbleEditorProps) {
  const [text, setText] = useState(bubble?.text || '');
  const [speaker, setSpeaker] = useState(bubble?.speaker || '');
  const [bubbleType, setBubbleType] = useState<'speech' | 'thought' | 'shout'>(bubble?.bubbleType || 'speech');

  if (!bubble) {
    return (
      <div className="p-4 text-sm text-gray-600">
        吹き出しを選択してください
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">テキスト</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-24 p-2 border border-gray-300 rounded text-sm resize-none"
          placeholder="セリフを入力..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">話者</label>
        <input
          type="text"
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          placeholder="話者名（オプション）"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">形状</label>
        <select
          value={bubbleType}
          onChange={(e) => setBubbleType(e.target.value as 'speech' | 'thought' | 'shout')}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="speech">通常の吹き出し</option>
          <option value="thought">思考の吹き出し</option>
          <option value="shout">叫びの吹き出し</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave?.({ text, speaker: speaker || undefined, bubbleType })}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
        >
          保存
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 text-sm"
        >
          削除
        </button>
      </div>
    </div>
  );
}

