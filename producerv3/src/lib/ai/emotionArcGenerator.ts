/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-emotion-arc
 * 
 * Emotion Arc Generator
 * Generates emotional arcs (EmotionalPlan) and analyzes emotion flow
 */
import type { EmotionProfile, EmotionScore } from '@/types/jsonld';

/**
 * Emotion beat in arc
 */
export interface EmotionBeat {
  position: number;
  targetEmotions: Record<string, number>;
  actualEmotions?: EmotionScore[];
  deviation?: number;
}

/**
 * Emotional arc (EmotionalPlan)
 */
export interface EmotionalArc {
  beats: EmotionBeat[];
  overallFlow: string;
  peakEmotion?: string;
  resolutionEmotion?: string;
}

/**
 * Generate emotion arc for a scene
 */
export function generateEmotionArc(
  sceneLength: number,
  targetEmotions?: Record<string, number>[]
): EmotionalArc {
  const beats: EmotionBeat[] = [];
  const beatCount = Math.max(3, Math.min(sceneLength / 500, 10)); // 3-10 beats based on scene length

  for (let i = 0; i < beatCount; i++) {
    const position = Math.floor((i / beatCount) * sceneLength);
    const targetEmotion = targetEmotions?.[i] || {};

    beats.push({
      position,
      targetEmotions: targetEmotion,
    });
  }

  // Determine overall flow
  const overallFlow = determineEmotionFlow(beats);

  // Find peak and resolution emotions
  const peakEmotion = findPeakEmotion(beats);
  const lastBeat = beats[beats.length - 1];
  const resolutionEmotion = lastBeat
    ? Object.keys(lastBeat.targetEmotions)[0]
    : undefined;

  const result: EmotionalArc = {
    beats,
    overallFlow,
  };
  if (peakEmotion) {
    result.peakEmotion = peakEmotion;
  }
  if (resolutionEmotion) {
    result.resolutionEmotion = resolutionEmotion;
  }
  return result;
}

/**
 * Analyze emotion arc from generated text emotion analysis
 */
export function analyzeEmotionArc(
  emotionProfiles: EmotionProfile[],
  targetArc?: EmotionalArc
): {
  actualArc: EmotionalArc;
  deviations: number[];
  alignment: number; // 0-1 score
} {
  const beats: EmotionBeat[] = emotionProfiles.map((profile, index) => {
    const targetBeat = targetArc?.beats[index];
    const deviation = targetBeat
      ? calculateDeviation(profile.emotionVector, targetBeat.targetEmotions)
      : 0;

    const beat: EmotionBeat = {
      position: index,
      targetEmotions: targetBeat?.targetEmotions || {},
      actualEmotions: profile.emotionVector,
    };
    if (deviation !== undefined && deviation !== 0) {
      beat.deviation = deviation;
    }
    return beat;
  });

  const deviations = beats.map((beat) => beat.deviation || 0);
  const alignment = calculateAlignment(deviations);

  const actualArc: EmotionalArc = {
    beats,
    overallFlow: determineEmotionFlow(beats),
  };

  return {
    actualArc,
    deviations,
    alignment,
  };
}

/**
 * Adjust content for emotion arc
 */
export function adjustContentForEmotionArc(
  content: string,
  targetBeat: EmotionBeat,
  currentEmotions: EmotionScore[]
): string {
  // Calculate deviation
  const deviation = calculateDeviation(currentEmotions, targetBeat.targetEmotions);

  // If deviation is small, no adjustment needed
  if (deviation < 0.2) {
    return content;
  }

  // Generate adjustment prompt
  const adjustmentPrompt = buildAdjustmentPrompt(targetBeat, currentEmotions, deviation);

  // Return adjusted content (in real implementation, this would call OpenAI)
  // For now, return original content with note
  return `${content}\n\n[Emotion adjustment needed: ${adjustmentPrompt}]`;
}

/**
 * Determine emotion flow from beats
 */
function determineEmotionFlow(beats: EmotionBeat[]): string {
  if (beats.length < 2) {
    return 'stable';
  }

  const firstBeat = beats[0];
  const lastBeat = beats[beats.length - 1];
  if (!firstBeat || !lastBeat) {
    return 'stable';
  }
  const firstEmotionKeys = Object.keys(firstBeat.targetEmotions);
  const lastEmotionKeys = Object.keys(lastBeat.targetEmotions);
  if (firstEmotionKeys.length === 0 || lastEmotionKeys.length === 0) {
    return 'stable';
  }
  const firstEmotion = firstEmotionKeys[0];
  const lastEmotion = lastEmotionKeys[0];

  if (firstEmotion === lastEmotion) {
    return 'stable';
  }

  // Common flows
  const flows: Record<string, string> = {
    'joy-sadness': 'tragic',
    'sadness-joy': 'uplifting',
    'fear-relief': 'resolving',
    'anger-trust': 'reconciling',
    'anticipation-surprise': 'revealing',
  };

  const flowKey = `${firstEmotion}-${lastEmotion}`;
  return flows[flowKey] || 'transitioning';
}

/**
 * Find peak emotion in arc
 */
function findPeakEmotion(beats: EmotionBeat[]): string | undefined {
  let maxIntensity = 0;
  let peakEmotion: string | undefined;

  beats.forEach((beat) => {
    Object.entries(beat.targetEmotions).forEach(([emotion, intensity]) => {
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        peakEmotion = emotion;
      }
    });
  });

  return peakEmotion;
}

/**
 * Calculate deviation between actual and target emotions
 */
function calculateDeviation(
  actualEmotions: EmotionScore[],
  targetEmotions: Record<string, number>
): number {
  if (Object.keys(targetEmotions).length === 0) {
    return 0;
  }

  let totalDeviation = 0;
  let count = 0;

  Object.entries(targetEmotions).forEach(([emotion, targetScore]) => {
    const actualScore =
      actualEmotions.find((e) => e.emotion === emotion)?.score || 0;
    const deviation = Math.abs(actualScore - targetScore);
    totalDeviation += deviation;
    count++;
  });

  return count > 0 ? totalDeviation / count : 0;
}

/**
 * Calculate alignment score from deviations
 */
function calculateAlignment(deviations: number[]): number {
  if (deviations.length === 0) {
    return 1;
  }

  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  return Math.max(0, 1 - avgDeviation);
}

/**
 * Build adjustment prompt
 */
function buildAdjustmentPrompt(
  targetBeat: EmotionBeat,
  currentEmotions: EmotionScore[],
  deviation: number
): string {
  const targetEmotionKeys = Object.keys(targetBeat.targetEmotions);
  if (targetEmotionKeys.length === 0) {
    return 'maintain';
  }
  const targetEmotion = targetEmotionKeys[0]!;
  const targetScore = targetBeat.targetEmotions[targetEmotion] ?? 0;
  const currentScore =
    currentEmotions.find((e) => e.emotion === targetEmotion)?.score || 0;

  if (currentScore < targetScore) {
    return `Increase ${targetEmotion} from ${currentScore.toFixed(2)} to ${targetScore.toFixed(2)}`;
  } else {
    return `Decrease ${targetEmotion} from ${currentScore.toFixed(2)} to ${targetScore.toFixed(2)}`;
  }
}

/**
 * Generate emotion arc from scene structure
 */
export function generateEmotionArcFromScene(
  sceneLength: number,
  sceneType: 'opening' | 'rising' | 'climax' | 'falling' | 'resolution'
): EmotionalArc {
  const baseEmotions: Record<string, Record<string, number>> = {
    opening: { curiosity: 0.6, anticipation: 0.4 },
    rising: { anticipation: 0.7, tension: 0.5 },
    climax: { surprise: 0.8, intensity: 0.9 },
    falling: { relief: 0.6, sadness: 0.4 },
    resolution: { relief: 0.7, hope: 0.6 },
  };

  const targetEmotions: Record<string, number> = (baseEmotions[sceneType] || baseEmotions.opening) as Record<string, number>;
  const beatCount = Math.max(3, Math.min(sceneLength / 500, 10));

  const beats: EmotionBeat[] = [];
  for (let i = 0; i < beatCount; i++) {
    const position = Math.floor((i / beatCount) * sceneLength);
    // Gradually transition emotions based on scene type
    const progress = beatCount > 1 ? i / (beatCount - 1) : 0;
    const adjustedEmotions: Record<string, number> = {};

    Object.entries(targetEmotions).forEach(([emotion, baseScore]) => {
      // Create a curve based on scene type
      let adjustedScore = baseScore;
      if (sceneType === 'climax') {
        adjustedScore = baseScore * (1 - Math.abs(progress - 0.5) * 2);
      } else if (sceneType === 'rising') {
        adjustedScore = baseScore * progress;
      } else if (sceneType === 'falling') {
        adjustedScore = baseScore * (1 - progress);
      }

      adjustedEmotions[emotion] = adjustedScore;
    });

    beats.push({
      position,
      targetEmotions: adjustedEmotions,
    });
  }

  const peakEmotion = findPeakEmotion(beats);
  const lastBeat = beats[beats.length - 1];
  const resolutionEmotion = lastBeat
    ? Object.keys(lastBeat.targetEmotions)[0]
    : undefined;

  const result: EmotionalArc = {
    beats,
    overallFlow: determineEmotionFlow(beats),
  };
  if (peakEmotion) {
    result.peakEmotion = peakEmotion;
  }
  if (resolutionEmotion) {
    result.resolutionEmotion = resolutionEmotion;
  }
  return result;
}

