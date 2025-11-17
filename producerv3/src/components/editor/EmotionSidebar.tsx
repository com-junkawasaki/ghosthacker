/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-sidebar
 * 
 * Emotion Sidebar Component
 * Displays emotion analysis data aligned with each line of the editor
 */
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EmotionScore } from '@/types/jsonld';
import { compareWithAllBenchmarks, getAllBenchmarks, getBenchmarkById, type BenchmarkComparisonResult } from '@/lib/ai/emotionBenchmark';
import { getDominantEmotion, getEmotionColor } from '@/lib/editor/emotionVisualization';

interface NodeEmotionData {
  nodeType: string;
  position: number;
  docPos: number;
  emotions: EmotionScore[];
  comparison?: {
    overallAlignment: number;
    comparisons: BenchmarkComparisonResult[];
    weightedAverage: number;
  };
}

interface NodePosition {
  nodeId: string;
  top: number;
  height: number;
  docPos: number;
}

interface EmotionSidebarProps {
  editor: Editor | null;
  selectedBenchmark?: string | null;
  onBenchmarkChange?: (benchmarkId: string | null) => void;
}

export function EmotionSidebar({ editor, selectedBenchmark, onBenchmarkChange }: EmotionSidebarProps) {
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<HTMLElement | null>(null);

  // Extract emotion data from all nodes
  const nodeEmotions = useMemo(() => {
    if (!editor) return [];

    const nodes: NodeEmotionData[] = [];
    let position = 0;

    editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      const attrs = node.attrs as Record<string, unknown>;
      const emotionVector = attrs.emotionVector as EmotionScore[] | null | undefined;

      if (emotionVector && emotionVector.length > 0) {
        const comparison = compareWithAllBenchmarks(emotionVector);
        nodes.push({
          nodeType: node.type.name,
          position,
          docPos: pos,
          emotions: emotionVector,
          comparison,
        });
        position++;
      }
    });

    return nodes;
  }, [editor?.state.doc]);

  // Calculate node positions in the DOM
  const calculateNodePositions = useCallback(() => {
    if (!editor || !editorContentRef.current) return;

    const editorElement = editorContentRef.current;
    const editorRect = editorElement.getBoundingClientRect();
    const positions: NodePosition[] = [];

    // Find all nodes with emotion data
    const nodesWithEmotions: Array<{ node: ProseMirrorNode; pos: number }> = [];
    editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
      const attrs = node.attrs as Record<string, unknown>;
      const emotionVector = attrs.emotionVector as EmotionScore[] | null | undefined;
      if (emotionVector && emotionVector.length > 0) {
        nodesWithEmotions.push({ node, pos });
      }
    });

    // Get DOM elements for each node
    nodesWithEmotions.forEach(({ node, pos }) => {
      // Find the DOM element for this node
      const domNode = editor.view.nodeDOM(pos);
      if (domNode && domNode instanceof HTMLElement) {
        const rect = domNode.getBoundingClientRect();
        const relativeTop = rect.top - editorRect.top + editorElement.scrollTop;
        positions.push({
          nodeId: `node-${pos}`,
          top: relativeTop,
          height: rect.height,
          docPos: pos,
        });
      }
    });

    setNodePositions(positions);
  }, [editor]);

  // Initialize editor content ref and calculate positions
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom.closest('.editor-content') as HTMLElement;
    if (editorElement) {
      editorContentRef.current = editorElement;
      calculateNodePositions();
    }
  }, [editor, calculateNodePositions]);

  // Update positions on scroll and resize
  useEffect(() => {
    if (!editorContentRef.current) return;

    const handleScroll = () => {
      calculateNodePositions();
    };

    const handleResize = () => {
      calculateNodePositions();
    };

    const editorElement = editorContentRef.current;
    editorElement.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver to watch for content changes
    const resizeObserver = new ResizeObserver(() => {
      calculateNodePositions();
    });
    resizeObserver.observe(editorElement);

    // Watch for editor updates
    const handleUpdate = () => {
      setTimeout(calculateNodePositions, 0);
    };
    editor.on('update', handleUpdate);

    return () => {
      editorElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      editor.off('update', handleUpdate);
    };
  }, [editor, calculateNodePositions]);

  // Match node emotions with positions
  const positionedEmotions = useMemo(() => {
    return nodePositions.map((pos) => {
      const emotionData = nodeEmotions.find((ne) => ne.docPos === pos.docPos);
      return {
        ...pos,
        emotionData,
      };
    });
  }, [nodePositions, nodeEmotions]);

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className="emotion-sidebar w-80 flex-shrink-0 border-l border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 overflow-y-auto"
      style={{ maxHeight: '100%' }}
    >
      <div className="p-4 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600 z-10">
        <h3 className="text-sm font-semibold mb-2">感情分析</h3>
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          {nodeEmotions.length} ノード分析済み
        </div>
        {/* Benchmark selector */}
        <div>
          <label className="text-xs font-semibold mb-1 block">ベンチマーク選択:</label>
          <select
            value={selectedBenchmark || ''}
            onChange={(e) => onBenchmarkChange?.(e.target.value || null)}
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
          >
            <option value="">全てのベンチマーク</option>
            {getAllBenchmarks().map((benchmark) => (
              <option key={benchmark['@id']} value={benchmark['@id']}>
                {benchmark.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative" style={{ minHeight: '100%' }}>
        {positionedEmotions.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
            感情分析データがありません。ノードを選択して感情分析を実行してください。
          </div>
        ) : (
          positionedEmotions.map((item) => {
            if (!item.emotionData) return null;

            const { emotionData } = item;
            const dominant = getDominantEmotion(emotionData.emotions);
            const color = dominant ? getEmotionColor(dominant.emotion) : null;
            const comparison = selectedBenchmark
              ? emotionData.comparison?.comparisons.find(
                  (c) => c.benchmarkId === selectedBenchmark
                )
              : undefined;
            const alignmentScore = comparison
              ? comparison.alignmentScore
              : emotionData.comparison?.overallAlignment || 0;

            return (
              <div
                key={item.nodeId}
                className="emotion-node-item absolute left-0 right-0 p-3 border-b border-gray-200 dark:border-gray-700"
                style={{
                  top: `${item.top}px`,
                  minHeight: `${Math.max(item.height, 60)}px`,
                }}
              >
                <div
                  className="h-full p-2 rounded border-l-4"
                  style={
                    color
                      ? {
                          borderLeftColor: color.border,
                          backgroundColor: color.bg,
                        }
                      : {
                          borderLeftColor: 'transparent',
                        }
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {emotionData.nodeType}
                      </span>
                      {dominant && (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: color?.bg,
                            color: color?.text,
                          }}
                        >
                          {dominant.emotion}: {(dominant.score * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold">一致度:</span>
                      <span
                        className={`text-xs font-bold ${
                          alignmentScore >= 70
                            ? 'text-green-600 dark:text-green-400'
                            : alignmentScore >= 50
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {alignmentScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Top emotions */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    {emotionData.emotions
                      .filter((emotion) => emotion && emotion.score !== undefined && emotion.score !== null)
                      .slice(0, 3)
                      .map((emotion, idx) => {
                      const emoColor = getEmotionColor(emotion.emotion);
                        const score = emotion.score ?? 0;
                      return (
                        <span
                          key={idx}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: emoColor.bg,
                            color: emoColor.text,
                          }}
                            title={`Score: ${score.toFixed(3)}`}
                        >
                            {emotion.emotion}: {(score * 100).toFixed(0)}%
                        </span>
                      );
                    })}
                  </div>

                  {/* Benchmark comparison details */}
                  {comparison && comparison.deviations.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-semibold mb-0.5">
                        {comparison.benchmarkName} との比較:
                      </div>
                      <div className="space-y-0.5">
                        {comparison.deviations.slice(0, 2).map((dev, idx) => (
                          <div key={idx} className="text-xs flex justify-between">
                            <span>{dev.emotion}:</span>
                            <span>
                              {dev.actualScore.toFixed(2)} / {dev.targetScore.toFixed(2)}
                              {' '}
                              <span
                                className={
                                  dev.deviation < 0.1
                                    ? 'text-green-600 dark:text-green-400'
                                    : dev.deviation < 0.2
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-red-600 dark:text-red-400'
                                }
                              >
                                (偏差: {dev.deviation.toFixed(2)})
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

