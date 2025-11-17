/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-visualization-view
 * 
 * Emotional View Component
 * Displays emotion scores, benchmark comparison, and emotion curve graph
 */
'use client';

import { useState, useMemo } from 'react';
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
}

export function EmotionalView({ editor }: EmotionalViewProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);

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
    <div className="emotional-view p-4 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">感情分析ビュー</h3>
        {overallStats && (
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
        )}
      </div>

      {/* Benchmark selector */}
      <div className="mb-4">
        <label className="text-sm font-semibold mb-2 block">ベンチマーク選択:</label>
        <select
          value={selectedBenchmark || ''}
          onChange={(e) => setSelectedBenchmark(e.target.value || null)}
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

      {/* Node emotion list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {nodeEmotions.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            感情分析データがありません。ノードを選択して感情分析を実行してください。
          </div>
        ) : (
          nodeEmotions.map((nodeData, index) => {
            const dominant = getDominantEmotion(nodeData.emotions);
            const color = dominant ? getEmotionColor(dominant.emotion) : null;
            const comparison = selectedBenchmark
              ? nodeData.comparison?.comparisons.find(
                  (c) => c.benchmarkId === selectedBenchmark
                )
              : undefined;
            const alignmentScore = comparison
              ? comparison.alignmentScore
              : nodeData.comparison?.overallAlignment || 0;

            return (
              <div
                key={index}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                style={
                  color
                    ? {
                        borderLeft: `4px solid ${color.border}`,
                        backgroundColor: color.bg,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {nodeData.nodeType}
                    </span>
                    {dominant && (
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: color?.bg,
                          color: color?.text,
                        }}
                      >
                        {dominant.emotion}: {(dominant.score * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
                <div className="flex flex-wrap gap-1 mb-2">
                  {nodeData.emotions.slice(0, 5).map((emotion, idx) => {
                    const emoColor = getEmotionColor(emotion.emotion);
                    return (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: emoColor.bg,
                          color: emoColor.text,
                        }}
                        title={`Score: ${emotion.score.toFixed(3)}`}
                      >
                        {emotion.emotion}: {(emotion.score * 100).toFixed(0)}%
                      </span>
                    );
                  })}
                </div>

                {/* Benchmark comparison details */}
                {comparison && comparison.deviations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold mb-1">
                      {comparison.benchmarkName} との比較:
                    </div>
                    <div className="space-y-1">
                      {comparison.deviations.slice(0, 3).map((dev, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span>{dev.emotion}:</span>
                          <span>
                            実際 {dev.actualScore.toFixed(2)} / 目標 {dev.targetScore.toFixed(2)}
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
            );
          })
        )}
      </div>
    </div>
  );
}

