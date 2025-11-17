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
import { useMutation, gql } from '@apollo/client';
import type { NodeClassificationResult, NodeForClassification } from '@/lib/ai/nodeClassifier';
import { reclassifyNode, getNodeTypeDisplayName, getNodeIdAndType } from '@/lib/ai/nodeClassifier';
import { UPDATE_NODE_TYPE } from '@/lib/graphql/mutations';

// Fallback empty mutation document if UPDATE_NODE_TYPE is not available
const EMPTY_MUTATION = gql`
  mutation EmptyMutation {
    __typename
  }
`;

interface NodeClassificationWithPosition {
  result: NodeClassificationResult;
  position: { from: number; to: number };
  nodeInfo: NodeForClassification;
  error?: string;
}

interface NodeClassificationDialogProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  classificationResult: NodeClassificationResult | null;
  nodePosition?: { from: number; to: number };
  multipleClassificationResults?: NodeClassificationWithPosition[];
  onReclassify?: (newType: string, newAttributes?: Record<string, unknown>) => void;
  onMultipleReclassify?: (appliedIndices: number[]) => void;
}

export function NodeClassificationDialog({
  editor,
  isOpen,
  onClose,
  classificationResult,
  nodePosition,
  multipleClassificationResults,
  onReclassify,
  onMultipleReclassify,
}: NodeClassificationDialogProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  // UpdateNodeType mutation - will be available after codegen runs with updated schema
  // Use fallback empty mutation if UPDATE_NODE_TYPE is not available
  const [updateNodeType] = useMutation(UPDATE_NODE_TYPE || EMPTY_MUTATION);

  const isMultipleMode = multipleClassificationResults && multipleClassificationResults.length > 0;

  if (!isOpen || (!classificationResult && !isMultipleMode)) {
    return null;
  }

  const handleApply = async () => {
    if (!editor || !nodePosition || !classificationResult) {
      return;
    }

    setIsApplying(true);

    try {
      // Get node ID and current type
      const nodeInfo = getNodeIdAndType(editor, nodePosition);
      
      // Update database if node has ID and mutation is available
      if (nodeInfo?.nodeId && nodeInfo.nodeType && UPDATE_NODE_TYPE) {
        try {
          await updateNodeType({
            variables: {
              input: {
                nodeId: nodeInfo.nodeId,
                oldType: nodeInfo.nodeType,
                newType: classificationResult.suggestedType,
                attributes: classificationResult.suggestedAttributes
                  ? JSON.parse(JSON.stringify(classificationResult.suggestedAttributes))
                  : undefined,
              },
            },
          });
        } catch (dbError) {
          console.error('Error updating database:', dbError);
          // Continue with editor update even if database update fails
        }
      }

      // Update editor
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

  const handleApplyNode = async (index: number) => {
    if (!editor || !multipleClassificationResults) {
      return;
    }

    const nodeData = multipleClassificationResults[index];
    if (!nodeData || !nodeData.position) {
      return;
    }

    setIsApplying(true);

    try {
      // Get node ID and current type
      const nodeInfo = getNodeIdAndType(editor, nodeData.position);
      
      // Update database if node has ID and mutation is available
      if (nodeInfo?.nodeId && nodeInfo.nodeType && UPDATE_NODE_TYPE) {
        try {
          await updateNodeType({
            variables: {
              input: {
                nodeId: nodeInfo.nodeId,
                oldType: nodeInfo.nodeType,
                newType: nodeData.result.suggestedType,
                attributes: nodeData.result.suggestedAttributes
                  ? JSON.parse(JSON.stringify(nodeData.result.suggestedAttributes))
                  : undefined,
              },
            },
          });
        } catch (dbError) {
          console.error('Error updating database:', dbError);
          // Continue with editor update even if database update fails
        }
      }

      // Update editor
      const success = reclassifyNode(
        editor,
        nodeData.position,
        nodeData.result.suggestedType,
        nodeData.result.suggestedAttributes as Record<string, unknown> | undefined
      );

      if (success) {
        const newAppliedIndices = new Set(appliedIndices);
        newAppliedIndices.add(index);
        setAppliedIndices(newAppliedIndices);
        setSkippedIndices((prev) => {
          const newSkipped = new Set(prev);
          newSkipped.delete(index);
          return newSkipped;
        });
      }
    } catch (error) {
      console.error('Error applying classification:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkipNode = (index: number) => {
    const newSkippedIndices = new Set(skippedIndices);
    newSkippedIndices.add(index);
    setSkippedIndices(newSkippedIndices);
    setAppliedIndices((prev) => {
      const newApplied = new Set(prev);
      newApplied.delete(index);
      return newApplied;
    });
  };

  const handleApplyAll = async () => {
    if (!editor || !multipleClassificationResults) {
      return;
    }

    setIsApplying(true);

    try {
      const applied: number[] = [];
      
      for (const [index, nodeData] of multipleClassificationResults.entries()) {
        if (!nodeData.position || skippedIndices.has(index) || appliedIndices.has(index)) {
          continue;
        }

        // Get node ID and current type
        const nodeInfo = getNodeIdAndType(editor, nodeData.position);
        
        // Update database if node has ID
        if (nodeInfo?.nodeId && nodeInfo.nodeType) {
          try {
            await updateNodeType({
              variables: {
                input: {
                  nodeId: nodeInfo.nodeId,
                  oldType: nodeInfo.nodeType,
                  newType: nodeData.result.suggestedType,
                  attributes: nodeData.result.suggestedAttributes
                    ? JSON.parse(JSON.stringify(nodeData.result.suggestedAttributes))
                    : undefined,
                },
              },
            });
          } catch (dbError) {
            console.error(`Error updating database for node ${index}:`, dbError);
            // Continue with editor update even if database update fails
          }
        }

        // Update editor
        const success = reclassifyNode(
          editor,
          nodeData.position,
          nodeData.result.suggestedType,
          nodeData.result.suggestedAttributes as Record<string, unknown> | undefined
        );

        if (success) {
          applied.push(index);
        }
      }

      if (applied.length > 0) {
        const newAppliedIndices = new Set([...appliedIndices, ...applied]);
        setAppliedIndices(newAppliedIndices);
      }

      if (onMultipleReclassify) {
        onMultipleReclassify([...appliedIndices, ...applied]);
      }
    } catch (error) {
      console.error('Error applying all classifications:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setAppliedIndices(new Set());
    setSkippedIndices(new Set());
    onClose();
  };

  // Single node mode rendering
  if (!isMultipleMode && classificationResult) {
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
              onClick={handleClose}
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

  // Multiple nodes mode rendering
  if (isMultipleMode && multipleClassificationResults) {
    const totalNodes = multipleClassificationResults.length;
    const appliedCount = appliedIndices.size;
    const skippedCount = skippedIndices.size;
    const remainingCount = totalNodes - appliedCount - skippedCount;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">複数ノード分類結果</h2>
            <div className="text-sm text-gray-600">
              進捗: {appliedCount}/{totalNodes} 適用済み | {skippedCount} スキップ | {remainingCount} 未処理
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(appliedCount / totalNodes) * 100}%` }}
              />
            </div>
          </div>

          {/* Node list */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {multipleClassificationResults.map((nodeData, index) => {
              const isApplied = appliedIndices.has(index);
              const isSkipped = skippedIndices.has(index);
              const confidenceColor =
                nodeData.result.confidence >= 0.8
                  ? 'text-green-600'
                  : nodeData.result.confidence >= 0.6
                  ? 'text-yellow-600'
                  : 'text-red-600';

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    isApplied
                      ? 'bg-green-50 border-green-300'
                      : isSkipped
                      ? 'bg-gray-50 border-gray-300 opacity-60'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">ノード {index + 1}</span>
                        {nodeData.error && (
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            エラー
                          </span>
                        )}
                        {isApplied && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            適用済み
                          </span>
                        )}
                        {isSkipped && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            スキップ
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        {nodeData.nodeInfo.text.substring(0, 50)}
                        {nodeData.nodeInfo.text.length > 50 ? '...' : ''}
                      </div>
                      {nodeData.nodeInfo.currentType && (
                        <div className="text-xs text-gray-500 mb-2">
                          現在のタイプ: {getNodeTypeDisplayName(nodeData.nodeInfo.currentType)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Classification result */}
                  {!isSkipped && (
                    <div className="space-y-2 mb-3">
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <span className="text-sm font-semibold text-blue-800">
                          {getNodeTypeDisplayName(nodeData.result.suggestedType)}
                        </span>
                        <span className={`ml-2 text-xs font-medium ${confidenceColor}`}>
                          (信頼度: {(nodeData.result.confidence * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                        {nodeData.result.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {nodeData.error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
                      {nodeData.error}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isApplied && !isSkipped && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleApplyNode(index)}
                        disabled={isApplying || !editor || !nodeData.position}
                        className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50"
                      >
                        適用
                      </button>
                      <button
                        onClick={() => handleSkipNode(index)}
                        disabled={isApplying}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 rounded disabled:opacity-50"
                      >
                        スキップ
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={handleApplyAll}
              disabled={isApplying || !editor || remainingCount === 0}
              className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded disabled:opacity-50"
            >
              {isApplying ? '適用中...' : `すべて適用 (${remainingCount}件)`}
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                disabled={isApplying}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

