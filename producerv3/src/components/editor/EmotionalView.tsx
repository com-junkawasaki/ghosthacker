/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-visualization-view
 * 
 * Emotional View Component
 * Displays emotion scores, benchmark comparison, and emotion curve graph
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EmotionScore } from '@/types/jsonld';
import { compareWithAllBenchmarks, getAllBenchmarks, getBenchmarkById, type BenchmarkComparisonResult } from '@/lib/ai/emotionBenchmark';
import { getDominantEmotion, getEmotionColor } from '@/lib/editor/emotionVisualization';
import { EmotionCurveGraph } from './EmotionCurveGraph';

interface NodeEmotionData {
  nodeType: string;
  position: number;
  emotions: EmotionScore[];
  comparison?: {
    overallAlignment: number;
    comparisons: BenchmarkComparisonResult[];
    weightedAverage: number;
  };
}

interface EmotionalViewProps {
  editor: Editor | null;
  selectedBenchmark?: string | null;
  onBenchmarkChange?: (benchmarkId: string | null) => void;
}

export function EmotionalView({ editor, selectedBenchmark: propSelectedBenchmark, onBenchmarkChange }: EmotionalViewProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(propSelectedBenchmark || null);
  const [isOpen, setIsOpen] = useState<boolean>(true); // デフォルトは開いた状態

  // Sync with prop changes
  useEffect(() => {
    if (propSelectedBenchmark !== undefined) {
      setSelectedBenchmark(propSelectedBenchmark);
    }
  }, [propSelectedBenchmark]);

  const handleBenchmarkChange = (benchmarkId: string | null) => {
    setSelectedBenchmark(benchmarkId);
    onBenchmarkChange?.(benchmarkId);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

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
          emotions: emotionVector,
          comparison,
        });
        position++;
      }
    });

    return nodes;
  }, [editor?.state.doc]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (nodeEmotions.length === 0) {
      return null;
    }

    const allAlignments = nodeEmotions
      .map((n) => n.comparison?.overallAlignment || 0)
      .filter((a) => a > 0);

    const avgAlignment =
      allAlignments.length > 0
        ? allAlignments.reduce((sum, a) => sum + a, 0) / allAlignments.length
        : 0;

    const weightedAverages = nodeEmotions
      .map((n) => n.comparison?.weightedAverage || 0)
      .filter((a) => a > 0);

    const avgWeighted =
      weightedAverages.length > 0
        ? weightedAverages.reduce((sum, a) => sum + a, 0) / weightedAverages.length
        : 0;

    return {
      nodeCount: nodeEmotions.length,
      avgAlignment,
      avgWeighted,
    };
  }, [nodeEmotions]);

  if (!editor) {
    return null;
  }

  return (
    <div className="emotional-view border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
      {/* Header with toggle button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">感情分析ビュー</h3>
          <button
            onClick={toggleOpen}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label={isOpen ? '閉じる' : '開く'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <div
        className={`emotional-view-content overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4">
          {/* Overall statistics */}
          {overallStats && (
            <div className="mb-4">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-semibold">分析ノード数:</span> {overallStats.nodeCount}
                </div>
                <div>
                  <span className="font-semibold">平均一致度:</span>{' '}
                  {overallStats.avgAlignment.toFixed(1)}%
                </div>
                <div>
                  <span className="font-semibold">加重平均:</span>{' '}
                  {overallStats.avgWeighted.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Benchmark selector */}
          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">ベンチマーク選択:</label>
            <select
              value={selectedBenchmark || ''}
              onChange={(e) => handleBenchmarkChange(e.target.value || null)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">全てのベンチマーク</option>
              {getAllBenchmarks().map((benchmark) => (
                <option key={benchmark['@id']} value={benchmark['@id']}>
                  {benchmark.name}
                </option>
              ))}
            </select>
          </div>

          {/* Emotion curve graph */}
          {nodeEmotions.length > 0 && (
            <div className="mb-4">
              <EmotionCurveGraph
                nodeEmotions={nodeEmotions.map((n) => ({
                  position: n.position,
                  emotions: n.emotions,
                }))}
                benchmark={selectedBenchmark ? getBenchmarkById(selectedBenchmark) : null}
              />
            </div>
          )}

          {nodeEmotions.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              感情分析データがありません。ノードを選択して感情分析を実行してください。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

