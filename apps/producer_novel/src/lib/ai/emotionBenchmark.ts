/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-benchmark-comparison
 * 
 * Emotion Benchmark Comparison
 * Loads and parses benchmark JSON-LD, compares actual emotion scores with benchmarks
 */
import type { EmotionScore } from '@/types/jsonld';
import benchmarkData from '@/data/emotionalBenchmarks.json';

/**
 * JSON-LD document structure with @graph array
 */
interface JsonLdDocument {
  '@context'?: unknown;
  '@graph'?: Array<EmotionalBenchmarkSet | EmotionalBenchmark>;
}

/**
 * Benchmark emotion score structure
 */
export interface BenchmarkEmotionScore {
  '@type': 'EmotionScore';
  emotion: string;
  score: number;
}

/**
 * Curve template segment
 */
export interface CurveSegment {
  segment: string;
}

/**
 * Emotional benchmark
 */
export interface EmotionalBenchmark {
  '@id': string;
  '@type': 'EmotionalBenchmark';
  name: string;
  order: number;
  weight: number;
  finalTarget: BenchmarkEmotionScore[];
  curveTemplate?: CurveSegment[];
}

/**
 * Emotional benchmark set
 */
export interface EmotionalBenchmarkSet {
  '@id': string;
  '@type': 'EmotionalBenchmarkSet';
  name: string;
  description: string;
  items: Array<{ '@id': string }>;
}

/**
 * Benchmark comparison result
 */
export interface BenchmarkComparisonResult {
  benchmarkId: string;
  benchmarkName: string;
  alignmentScore: number; // 0-100%
  deviations: Array<{
    emotion: string;
    actualScore: number;
    targetScore: number;
    deviation: number;
  }>;
  curveAlignment?: number; // 0-100% if curveTemplate exists
}

/**
 * Load benchmarks from JSON-LD
 */
export function loadBenchmarks(): {
  sets: EmotionalBenchmarkSet[];
  benchmarks: Map<string, EmotionalBenchmark>;
} {
  const benchmarks = new Map<string, EmotionalBenchmark>();
  const sets: EmotionalBenchmarkSet[] = [];

  // Parse JSON-LD graph
  const jsonLdDoc = benchmarkData as JsonLdDocument;
  const graph = jsonLdDoc['@graph'] ?? [];
  
  for (const item of graph) {
    if (item['@type'] === 'EmotionalBenchmarkSet') {
      sets.push(item as EmotionalBenchmarkSet);
    } else if (item['@type'] === 'EmotionalBenchmark') {
      const benchmark = item as EmotionalBenchmark;
      benchmarks.set(benchmark['@id'], benchmark);
    }
  }

  return { sets, benchmarks };
}

/**
 * Compare actual emotion scores with benchmark finalTarget
 */
export function compareWithBenchmark(
  actualScores: EmotionScore[],
  benchmark: EmotionalBenchmark
): BenchmarkComparisonResult {
  const actualMap = new Map<string, number>();
  actualScores.forEach((score) => {
    actualMap.set(score.emotion, score.score);
  });

  const deviations: Array<{
    emotion: string;
    actualScore: number;
    targetScore: number;
    deviation: number;
  }> = [];

  let totalDeviation = 0;
  let count = 0;

  // Compare with finalTarget
  benchmark.finalTarget.forEach((target) => {
    const actualScore = actualMap.get(target.emotion) || 0;
    const deviation = Math.abs(actualScore - target.score);
    deviations.push({
      emotion: target.emotion,
      actualScore,
      targetScore: target.score,
      deviation,
    });
    totalDeviation += deviation;
    count++;
  });

  // Also check for emotions in actual but not in target
  actualScores.forEach((actual) => {
    const inTarget = benchmark.finalTarget.some(
      (target) => target.emotion === actual.emotion
    );
    if (!inTarget && actual.score > 0.1) {
      // Significant emotion not in target
      deviations.push({
        emotion: actual.emotion,
        actualScore: actual.score,
        targetScore: 0,
        deviation: actual.score,
      });
      totalDeviation += actual.score;
      count++;
    }
  });

  const avgDeviation = count > 0 ? totalDeviation / count : 1.0;
  const alignmentScore = Math.max(0, Math.min(100, (1 - avgDeviation) * 100));

  return {
    benchmarkId: benchmark['@id'],
    benchmarkName: benchmark.name,
    alignmentScore,
    deviations,
  };
}

/**
 * Compare with all benchmarks and return weighted average
 */
export function compareWithAllBenchmarks(
  actualScores: EmotionScore[]
): {
  overallAlignment: number;
  comparisons: BenchmarkComparisonResult[];
  weightedAverage: number;
} {
  const { benchmarks } = loadBenchmarks();
  const comparisons: BenchmarkComparisonResult[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  benchmarks.forEach((benchmark) => {
    const comparison = compareWithBenchmark(actualScores, benchmark);
    comparisons.push(comparison);
    weightedSum += comparison.alignmentScore * benchmark.weight;
    totalWeight += benchmark.weight;
  });

  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const overallAlignment = comparisons.length > 0
    ? comparisons.reduce((sum, c) => sum + c.alignmentScore, 0) / comparisons.length
    : 0;

  return {
    overallAlignment,
    comparisons,
    weightedAverage,
  };
}

/**
 * Get benchmark by ID
 */
export function getBenchmarkById(benchmarkId: string): EmotionalBenchmark | null {
  const { benchmarks } = loadBenchmarks();
  return benchmarks.get(benchmarkId) || null;
}

/**
 * Get all benchmarks
 */
export function getAllBenchmarks(): EmotionalBenchmark[] {
  const { benchmarks } = loadBenchmarks();
  return Array.from(benchmarks.values());
}

