/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/floating-toolbar
 * 
 * Floating toolbar that appears when text is selected in the editor
 * Provides buttons to add masks and insert JSON-LD nodes
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
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

const NODE_TYPES = [
  { type: 'character', label: 'Character' },
  { type: 'ghost', label: 'Ghost' },
  { type: 'location', label: 'Location' },
  { type: 'organization', label: 'Organization' },
  { type: 'technology', label: 'Technology' },
  { type: 'episode', label: 'Episode' },
  { type: 'scene', label: 'Scene' },
  { type: 'arc', label: 'Arc' },
  { type: 'motif', label: 'Motif' },
];

interface FloatingToolbarProps {
  editor: Editor;
  onInsertNode?: (nodeType: string) => void;
}

export function FloatingToolbar({ editor, onInsertNode }: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      const isEmpty = from === to;

      if (isEmpty) {
        setIsVisible(false);
        return;
      }

      // Get selection coordinates
      const { view } = editor;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Calculate toolbar position (above selection)
      const top = start.top - 10;
      const left = (start.left + end.left) / 2;

      setPosition({ top, left });
      setIsVisible(true);
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('transaction', updateToolbar);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('transaction', updateToolbar);
    };
  }, [editor]);

  const handleAddMask = (maskType: MaskType['type']) => {
    const { from, to } = editor.state.selection;
    if (from === to) return;

    // Apply mask to selected text (toggle mask on/off)
    editor.chain().focus().setMask(maskType, true).run();
  };

  const handleInsertNode = (nodeType: string) => {
    if (onInsertNode) {
      onInsertNode(nodeType);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Mask buttons */}
      <div className="flex gap-1 border-r border-gray-300 pr-2">
        <span className="text-xs text-gray-500 self-center mr-1">Mask:</span>
        {MASK_TYPES.slice(0, 5).map((mask) => (
          <button
            key={mask.type}
            onClick={() => handleAddMask(mask.type)}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title={mask.label}
          >
            {mask.label}
          </button>
        ))}
      </div>

      {/* Node insertion buttons */}
      <div className="flex gap-1">
        <span className="text-xs text-gray-500 self-center mr-1">Insert:</span>
        {NODE_TYPES.slice(0, 5).map((node) => (
          <button
            key={node.type}
            onClick={() => handleInsertNode(node.type)}
            className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors"
            title={node.label}
          >
            {node.label}
          </button>
        ))}
      </div>
    </div>
  );
}

