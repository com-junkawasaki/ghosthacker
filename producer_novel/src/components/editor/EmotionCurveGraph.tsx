/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-curve-graph
 * 
 * Emotion Curve Graph Component
 * Displays emotion curve comparison between actual and benchmark
 */
'use client';

import { useMemo } from 'react';
import type { EmotionScore } from '@/types/jsonld';
import { getAllBenchmarks, type EmotionalBenchmark } from '@/lib/ai/emotionBenchmark';

interface EmotionCurveGraphProps {
  nodeEmotions: Array<{
    position: number;
    emotions: EmotionScore[];
  }>;
  benchmark?: EmotionalBenchmark | null;
}

export function EmotionCurveGraph({ nodeEmotions, benchmark }: EmotionCurveGraphProps) {
  // Prepare data for graph
  const graphData = useMemo(() => {
    if (nodeEmotions.length === 0) return [];

    // Get dominant emotion for each node
    const points = nodeEmotions
      .map((node) => {
        if (node.emotions.length === 0) return null;
        const dominant = node.emotions.reduce(
          (max, e) => (e.score > max.score ? e : max),
          node.emotions[0]!
        );
        return {
          position: node.position,
          emotion: dominant.emotion,
          score: dominant.score,
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);

    // Group by emotion and calculate average score per position
    const emotionGroups: Record<string, Array<{ position: number; score: number }>> = {};
    points.forEach((point) => {
      if (!point) return;
      if (!emotionGroups[point.emotion]) {
        emotionGroups[point.emotion] = [];
      }
      emotionGroups[point.emotion]!.push({ position: point.position, score: point.score });
    });

    // Create series for each emotion
    const maxPosition = Math.max(...points.map((p) => p.position), 0);
    const series = Object.entries(emotionGroups).map(([emotion, data]) => {
      // Normalize positions to 0-100
      const normalizedData = data.map((d) => ({
        x: maxPosition > 0 ? (d.position / maxPosition) * 100 : 0,
        y: d.score * 100,
        emotion,
      }));

      return {
        emotion,
        data: normalizedData,
        color: getEmotionColorHex(emotion),
      };
    });

    return series;
  }, [nodeEmotions]);

  // Benchmark target data
  const benchmarkData = useMemo(() => {
    if (!benchmark) return null;

    return benchmark.finalTarget.map((target) => ({
      emotion: target.emotion,
      score: target.score * 100,
      color: getEmotionColorHex(target.emotion),
    }));
  }, [benchmark]);

  if (graphData.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        グラフデータがありません
      </div>
    );
  }

  // Simple SVG-based line chart
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <div className="emotion-curve-graph p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <h4 className="text-sm font-semibold mb-4">
        {benchmark ? `${benchmark.name} との比較` : '感情曲線'}
      </h4>
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
              className="dark:stroke-gray-700"
            />
          </pattern>
        </defs>
        <rect
          width={width}
          height={height}
          fill="url(#grid)"
          className="dark:fill-gray-900"
        />

        {/* Chart area */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1={0}
                y1={chartHeight - (value / 100) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (value / 100) * chartHeight}
                stroke="#d1d5db"
                strokeWidth="1"
                strokeDasharray="2,2"
                className="dark:stroke-gray-700"
              />
              <text
                x={-10}
                y={chartHeight - (value / 100) * chartHeight + 4}
                textAnchor="end"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {value}%
              </text>
            </g>
          ))}

          {/* X-axis */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="#374151"
            strokeWidth="2"
            className="dark:stroke-gray-400"
          />

          {/* Emotion lines */}
          {graphData.map((series, idx) => {
            if (series.data.length === 0) return null;

            const pathData = series.data
              .map(
                (point, i) =>
                  `${i === 0 ? 'M' : 'L'} ${point.x} ${chartHeight - point.y}`
              )
              .join(' ');

            return (
              <g key={series.emotion}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="2"
                  opacity="0.7"
                />
                {/* Points */}
                {series.data.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={chartHeight - point.y}
                    r="4"
                    fill={series.color}
                    className="hover:r-6 transition-all"
                  />
                ))}
                {/* Legend */}
                <text
                  x={chartWidth - 100}
                  y={20 + idx * 20}
                  fill={series.color}
                  className="text-xs font-semibold"
                >
                  {series.emotion}
                </text>
              </g>
            );
          })}

          {/* Benchmark target lines (dashed) */}
          {benchmarkData &&
            benchmarkData.map((target, idx) => {
              const y = chartHeight - target.score;
              return (
                <g key={`benchmark-${target.emotion}`}>
                  <line
                    x1={0}
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke={target.color}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.5"
                  />
                  <text
                    x={chartWidth + 5}
                    y={y + 4}
                    fill={target.color}
                    className="text-xs"
                    opacity="0.7"
                  >
                    {target.emotion} (目標)
                  </text>
                </g>
              );
            })}
        </g>
      </svg>
    </div>
  );
}

/**
 * Get hex color for emotion (simplified version)
 */
function getEmotionColorHex(emotion: string): string {
  const colors: Record<string, string> = {
    joy: '#FFC107',
    sadness: '#2196F3',
    fear: '#9C27B0',
    anger: '#F44336',
    surprise: '#FF9800',
    trust: '#4CAF50',
    anticipation: '#FFC107',
    disgust: '#795548',
    relief: '#81C784',
    hope: '#90CAF9',
  };
  return colors[emotion.toLowerCase()] || '#9E9E9E';
}

