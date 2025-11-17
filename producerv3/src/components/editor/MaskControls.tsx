/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/mask-controls
 * 
 * マスク制御UIコンポーネント
 */
'use client';

import { useState } from 'react';
import { useEditor } from '@tiptap/react';
import { MaskType } from '@/types/jsonld';

const MASK_TYPES: Array<{ type: MaskType['type']; label: string }> = [
  { type: 'emotion', label: 'Emotion' },
  { type: 'theme', label: 'Theme' },
  { type: 'context', label: 'Context' },
  { type: 'notes', label: 'Notes' },
  { type: 'relationship', label: 'Relationship' },
  { type: 'virtue', label: 'Virtue' },
  { type: 'anchoredTo', label: 'Anchored To' },
  { type: 'emitsRepelsAvoids', label: 'Emits/Repels/Avoids' },
  { type: 'phase', label: 'Phase' },
  { type: 'role', label: 'Role' },
];

export function MaskControls() {
  const editor = useEditor();
  const [activeMasks, setActiveMasks] = useState<Set<MaskType['type']>>(new Set());

  if (!editor) {
    return null;
  }

  const toggleMask = (maskType: MaskType['type']) => {
    editor.chain().focus().toggleMask(maskType).run();
    setActiveMasks((prev) => {
      const next = new Set(prev);
      if (next.has(maskType)) {
        next.delete(maskType);
      } else {
        next.add(maskType);
      }
      return next;
    });
  };

  const toggleAllMasks = () => {
    editor.chain().focus().toggleAllMasks().run();
    setActiveMasks((prev) => {
      if (prev.size === MASK_TYPES.length) {
        return new Set();
      }
      return new Set(MASK_TYPES.map((m) => m.type));
    });
  };

  return (
    <div className="mask-controls p-2 border-t border-gray-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold">Masks:</span>
        <button
          onClick={toggleAllMasks}
          className={`px-2 py-1 text-xs rounded ${
            activeMasks.size === MASK_TYPES.length
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Toggle All
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {MASK_TYPES.map((mask) => (
          <button
            key={mask.type}
            onClick={() => toggleMask(mask.type)}
            className={`px-2 py-1 text-xs rounded ${
              activeMasks.has(mask.type)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {mask.label}
          </button>
        ))}
      </div>
    </div>
  );
}

