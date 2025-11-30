/**
 * Story Element Connection Component
 * ストーリー要素間の接続作成UI
 */

import { useState } from 'react';
import { StoryElementEdgeType, EDGE_TYPE_COLORS } from './types';

interface StoryElementConnectionProps {
  sourceId: string | null;
  targetId: string | null;
  onConnect: (sourceId: string, targetId: string, edgeType: StoryElementEdgeType, label: string) => void;
  onCancel: () => void;
}

const EDGE_TYPE_LABELS: Record<StoryElementEdgeType, string> = {
  contains: '含む',
  belongsTo: '属する',
  appearsIn: '登場する',
  influences: '影響する',
  precedes: '先行する',
  causes: '引き起こす',
  conflictsWith: '対立する',
  relatesTo: '関連する',
};

export default function StoryElementConnection({
  sourceId,
  targetId,
  onConnect,
  onCancel,
}: StoryElementConnectionProps) {
  const [selectedEdgeType, setSelectedEdgeType] = useState<StoryElementEdgeType>('relatesTo');
  const [customLabel, setCustomLabel] = useState<string>('');

  const handleConnect = () => {
    if (sourceId && targetId) {
      const label = customLabel || EDGE_TYPE_LABELS[selectedEdgeType];
      onConnect(sourceId, targetId, selectedEdgeType, label);
    }
  };

  if (!sourceId) {
    return (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          ソースノードを選択してください
        </p>
        <button
          onClick={onCancel}
          className="mt-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          キャンセル
        </button>
      </div>
    );
  }

  if (!targetId) {
    return (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          ターゲットノードを選択してください
        </p>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            関係タイプ
          </label>
          <select
            value={selectedEdgeType}
            onChange={(e) => setSelectedEdgeType(e.target.value as StoryElementEdgeType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {Object.entries(EDGE_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            カスタムラベル（オプション）
          </label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder={EDGE_TYPE_LABELS[selectedEdgeType]}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        接続を作成しますか？
      </p>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          関係タイプ
        </label>
        <select
          value={selectedEdgeType}
          onChange={(e) => setSelectedEdgeType(e.target.value as StoryElementEdgeType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {Object.entries(EDGE_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          ラベル
        </label>
        <input
          type="text"
          value={customLabel || EDGE_TYPE_LABELS[selectedEdgeType]}
          onChange={(e) => setCustomLabel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          キャンセル
        </button>
        <button
          onClick={handleConnect}
          className="flex-1 px-4 py-2 text-white rounded-md hover:opacity-90"
          style={{ backgroundColor: EDGE_TYPE_COLORS[selectedEdgeType] }}
        >
          接続
        </button>
      </div>
    </div>
  );
}

