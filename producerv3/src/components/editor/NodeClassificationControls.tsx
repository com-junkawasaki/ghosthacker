/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/node-classification-controls
 * 
 * Node Classification Controls Component
 * Toolbar button and controls for node classification
 */
'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useMutation } from '@apollo/client';
import { extractNodeForClassification } from '@/lib/ai/nodeClassifier';
import { extractEditorContext, extractContextAroundCursor } from '@/lib/editor/contextExtractor';
import { NodeClassificationDialog } from './NodeClassificationDialog';
import { CLASSIFY_NODE } from '@/lib/graphql/mutations';
import type { NodeClassificationResult } from '@/lib/ai/nodeClassifier';

interface NodeClassificationControlsProps {
  editor: Editor | null;
}

export function NodeClassificationControls({ editor }: NodeClassificationControlsProps) {
  const [isClassifying, setIsClassifying] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [classificationResult, setClassificationResult] = useState<NodeClassificationResult | null>(null);
  const [nodePosition, setNodePosition] = useState<{ from: number; to: number } | undefined>();
  const [error, setError] = useState<string | null>(null);

  const [classifyNode] = useMutation(CLASSIFY_NODE);

  if (!editor) {
    return null;
  }

  const handleClassify = async () => {
    if (!editor) {
      return;
    }

    setIsClassifying(true);
    setError(null);

    try {
      const { state } = editor;
      const { selection } = state;
      const { from, to } = selection;

      // Extract node information for classification
      let nodeInfo = extractNodeForClassification(editor);

      // If no node selected, try to get node at cursor position
      if (!nodeInfo && !selection.empty) {
        const node = state.doc.nodeAt(from);
        if (node) {
          nodeInfo = extractNodeForClassification(editor, node, { from, to });
        }
      }

      // If still no node, use context around cursor
      if (!nodeInfo) {
        const context = extractContextAroundCursor(editor, 100);
        if (context.selectedText) {
          nodeInfo = {
            text: context.selectedText,
            context: context.selectedText,
          };
        }
      }

      if (!nodeInfo || !nodeInfo.text.trim()) {
        setError('分類対象のノードまたはテキストを選択してください');
        setIsClassifying(false);
        return;
      }

      // Prepare mask info for API
      const maskInfo = nodeInfo.maskInfo
        ? {
            masks: nodeInfo.maskInfo.map((mask) => ({
              type: mask.type,
              enabled: mask.enabled,
              attributes: mask.attributes,
            })),
          }
        : undefined;

      // Call GraphQL mutation
      const { data } = await classifyNode({
        variables: {
          input: {
            text: nodeInfo.text,
            currentType: nodeInfo.currentType || undefined,
            attributes: nodeInfo.attributes ? JSON.parse(JSON.stringify(nodeInfo.attributes)) : undefined,
            maskInfo: maskInfo ? JSON.parse(JSON.stringify(maskInfo)) : undefined,
            context: nodeInfo.context || undefined,
          },
        },
      });

      if (data?.classifyNode) {
        setClassificationResult(data.classifyNode);
        setNodePosition(nodeInfo.position || { from, to });
        setShowDialog(true);
      } else {
        setError('分類に失敗しました');
      }
    } catch (err) {
      console.error('Classification error:', err);
      setError(err instanceof Error ? err.message : '分類に失敗しました');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleReclassify = (newType: string, newAttributes?: Record<string, unknown>) => {
    // Classification is applied in the dialog
    setShowDialog(false);
    setClassificationResult(null);
    setNodePosition(undefined);
  };

  return (
    <>
      <button
        onClick={handleClassify}
        disabled={isClassifying}
        className="px-3 py-1 rounded bg-purple-100 text-purple-800 hover:bg-purple-200 text-sm font-medium disabled:opacity-50"
        title="選択範囲のノードをAIで分類"
      >
        {isClassifying ? '分類中...' : '🔍 ノード分類'}
      </button>

      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <div className="font-bold">エラー</div>
          <div>{error}</div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm underline"
          >
            閉じる
          </button>
        </div>
      )}

      <NodeClassificationDialog
        editor={editor}
        isOpen={showDialog}
        onClose={() => {
          setShowDialog(false);
          setClassificationResult(null);
          setNodePosition(undefined);
        }}
        classificationResult={classificationResult}
        nodePosition={nodePosition}
        onReclassify={handleReclassify}
      />
    </>
  );
}

