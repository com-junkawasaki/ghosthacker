/**
 * Story Element FAB Component
 * ストーリー要素追加用のFloating Action Button
 */

import { useState } from 'react';
import { StoryElementNodeType, ELEMENT_TYPE_LABELS } from './types';

interface StoryElementFABProps {
  onSelectType: (type: StoryElementNodeType) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ELEMENT_TYPE_ICONS: Record<StoryElementNodeType, string> = {
  worldview: '🌍',
  background: '📖',
  timeline: '⏱️',
  beat: '🎬',
  character: '👤',
  scene: '🎭',
  event: '⚡',
  context: '@',
};

export default function StoryElementFAB({ onSelectType, isOpen, onToggle }: StoryElementFABProps) {
  const [hoveredType, setHoveredType] = useState<StoryElementNodeType | null>(null);

  const elementTypes: StoryElementNodeType[] = [
    'worldview',
    'background',
    'timeline',
    'beat',
    'character',
    'scene',
    'event',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Main FAB Button */}
      <button
        onClick={onToggle}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl transition-transform duration-200"
        style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
        title="Add Story Element"
      >
        +
      </button>

      {/* Element Type Buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 animate-in slide-in-from-bottom-2">
          {elementTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                onSelectType(type);
                onToggle();
              }}
              onMouseEnter={() => setHoveredType(type)}
              onMouseLeave={() => setHoveredType(null)}
              className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-200 hover:scale-110"
              style={{
                backgroundColor: hoveredType === type ? '#3b82f6' : '#6366f1',
              }}
              title={ELEMENT_TYPE_LABELS[type]}
            >
              {ELEMENT_TYPE_ICONS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

