/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/node-classification-dialog
 * 
 * Node Classification Dialog Component
 * Displays classification results and allows reclassification
 */
'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { NodeClassificationResult } from '@/lib/ai/nodeClassifier';
import { reclassifyNode, getNodeTypeDisplayName } from '@/lib/ai/nodeClassifier';

interface NodeClassificationDialogProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  classificationResult: NodeClassificationResult | null;
  nodePosition?: { from: number; to: number };
  onReclassify?: (newType: string, newAttributes?: Record<string, unknown>) => void;
}

export function NodeClassificationDialog({
  editor,
  isOpen,
  onClose,
  classificationResult,
  nodePosition,
  onReclassify,
}: NodeClassificationDialogProps) {
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen || !classificationResult) {
    return null;
  }

  const handleApply = () => {
    if (!editor || !nodePosition || !classificationResult) {
      return;
    }

    setIsApplying(true);

    try {
      const success = reclassifyNode(
        editor,
        nodePosition,
        classificationResult.suggestedType,
        classificationResult.suggestedAttributes as Record<string, unknown> | undefined
      );

      if (success && onReclassify) {
        onReclassify(
          classificationResult.suggestedType,
          classificationResult.suggestedAttributes as Record<string, unknown> | undefined
        );
      }

      onClose();
    } catch (error) {
      console.error('Error applying classification:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const confidenceColor =
    classificationResult.confidence >= 0.8
      ? 'text-green-600'
      : classificationResult.confidence >= 0.6
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">ノード分類結果</h2>

        <div className="space-y-4">
          {/* Suggested Type */}
          <div>
            <label className="block text-sm font-medium mb-1">推奨タイプ</label>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <span className="text-lg font-semibold text-blue-800">
                {getNodeTypeDisplayName(classificationResult.suggestedType)}
              </span>
              <span className={`ml-2 text-sm font-medium ${confidenceColor}`}>
                (信頼度: {(classificationResult.confidence * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <label className="block text-sm font-medium mb-1">分類理由</label>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-700">{classificationResult.reasoning}</p>
            </div>
          </div>

          {/* Suggested Attributes */}
          {classificationResult.suggestedAttributes && (
            <div>
              <label className="block text-sm font-medium mb-1">推奨属性</label>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(classificationResult.suggestedAttributes, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Suggested Mask Type */}
          {classificationResult.suggestedMaskType && (
            <div>
              <label className="block text-sm font-medium mb-1">推奨マスクタイプ</label>
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <span className="text-sm font-medium text-purple-800">
                  {classificationResult.suggestedMaskType}
                </span>
              </div>
            </div>
          )}

          {/* Confidence Bar */}
          <div>
            <label className="block text-sm font-medium mb-1">信頼度</label>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  classificationResult.confidence >= 0.8
                    ? 'bg-green-500'
                    : classificationResult.confidence >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${classificationResult.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying || !editor || !nodePosition}
            className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50"
          >
            {isApplying ? '適用中...' : '適用'}
          </button>
        </div>
      </div>
    </div>
  );
}

