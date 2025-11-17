/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-visualization
 * 
 * Emotion Visualization
 * Generates colors from emotion scores for node visualization
 */
import type { EmotionScore } from '@/types/jsonld';

/**
 * Emotion color mapping
 */
const EMOTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  joy: {
    bg: 'rgba(255, 235, 59, 0.3)', // Yellow
    border: 'rgba(255, 193, 7, 0.8)',
    text: 'rgba(255, 152, 0, 1)',
  },
  sadness: {
    bg: 'rgba(33, 150, 243, 0.3)', // Blue
    border: 'rgba(25, 118, 210, 0.8)',
    text: 'rgba(13, 71, 161, 1)',
  },
  fear: {
    bg: 'rgba(156, 39, 176, 0.3)', // Purple
    border: 'rgba(142, 36, 170, 0.8)',
    text: 'rgba(74, 20, 140, 1)',
  },
  anger: {
    bg: 'rgba(244, 67, 54, 0.3)', // Red
    border: 'rgba(211, 47, 47, 0.8)',
    text: 'rgba(183, 28, 28, 1)',
  },
  surprise: {
    bg: 'rgba(255, 152, 0, 0.3)', // Orange
    border: 'rgba(255, 111, 0, 0.8)',
    text: 'rgba(230, 81, 0, 1)',
  },
  trust: {
    bg: 'rgba(76, 175, 80, 0.3)', // Green
    border: 'rgba(56, 142, 60, 0.8)',
    text: 'rgba(27, 94, 32, 1)',
  },
  anticipation: {
    bg: 'rgba(255, 193, 7, 0.3)', // Amber
    border: 'rgba(255, 160, 0, 0.8)',
    text: 'rgba(255, 143, 0, 1)',
  },
  disgust: {
    bg: 'rgba(121, 85, 72, 0.3)', // Brown
    border: 'rgba(93, 64, 55, 0.8)',
    text: 'rgba(62, 39, 35, 1)',
  },
  relief: {
    bg: 'rgba(129, 199, 132, 0.3)', // Light Green
    border: 'rgba(102, 187, 106, 0.8)',
    text: 'rgba(56, 142, 60, 1)',
  },
  hope: {
    bg: 'rgba(144, 202, 249, 0.3)', // Light Blue
    border: 'rgba(100, 181, 246, 0.8)',
    text: 'rgba(25, 118, 210, 1)',
  },
};

/**
 * Default colors when emotion is not found
 */
const DEFAULT_COLORS = {
  bg: 'rgba(224, 224, 224, 0.2)',
  border: 'rgba(158, 158, 158, 0.5)',
  text: 'rgba(97, 97, 97, 1)',
};

/**
 * Get dominant emotion from emotion scores
 */
export function getDominantEmotion(emotionScores: EmotionScore[]): EmotionScore | null {
  if (!emotionScores || emotionScores.length === 0) {
    return null;
  }

  // Sort by score descending and return the highest
  const sorted = [...emotionScores].sort((a, b) => b.score - a.score);
  return sorted[0].score > 0 ? sorted[0] : null;
}

/**
 * Get color for a specific emotion
 */
export function getEmotionColor(emotion: string): {
  bg: string;
  border: string;
  text: string;
} {
  return EMOTION_COLORS[emotion.toLowerCase()] || DEFAULT_COLORS;
}

/**
 * Calculate blended color from multiple emotion scores
 */
export function calculateBlendedColor(emotionScores: EmotionScore[]): {
  bg: string;
  border: string;
  text: string;
  dominantEmotion: string | null;
} {
  if (!emotionScores || emotionScores.length === 0) {
    return {
      ...DEFAULT_COLORS,
      dominantEmotion: null,
    };
  }

  // Get top 3 emotions by score
  const topEmotions = [...emotionScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((e) => e.score > 0);

  if (topEmotions.length === 0) {
    return {
      ...DEFAULT_COLORS,
      dominantEmotion: null,
    };
  }

  // Use dominant emotion for primary color
  const dominant = topEmotions[0];
  const dominantColor = getEmotionColor(dominant.emotion);

  // If dominant emotion has high score (>0.5), use it directly
  if (dominant.score > 0.5) {
    return {
      ...dominantColor,
      dominantEmotion: dominant.emotion,
    };
  }

  // Otherwise, blend with secondary emotions
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgA = 0;
  let borderR = 0;
  let borderG = 0;
  let borderB = 0;
  let borderA = 0;
  let totalWeight = 0;

  topEmotions.forEach((emotion) => {
    const color = getEmotionColor(emotion.emotion);
    const weight = emotion.score;

    // Parse RGB from rgba strings
    const bgMatch = color.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const borderMatch = color.border.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

    if (bgMatch) {
      bgR += parseInt(bgMatch[1]) * weight;
      bgG += parseInt(bgMatch[2]) * weight;
      bgB += parseInt(bgMatch[3]) * weight;
      bgA += parseFloat(bgMatch[4] || '0.3') * weight;
    }

    if (borderMatch) {
      borderR += parseInt(borderMatch[1]) * weight;
      borderG += parseInt(borderMatch[2]) * weight;
      borderB += parseInt(borderMatch[3]) * weight;
      borderA += parseFloat(borderMatch[4] || '0.8') * weight;
    }

    totalWeight += weight;
  });

  if (totalWeight > 0) {
    bgR = Math.round(bgR / totalWeight);
    bgG = Math.round(bgG / totalWeight);
    bgB = Math.round(bgB / totalWeight);
    bgA = bgA / totalWeight;
    borderR = Math.round(borderR / totalWeight);
    borderG = Math.round(borderG / totalWeight);
    borderB = Math.round(borderB / totalWeight);
    borderA = borderA / totalWeight;

    return {
      bg: `rgba(${bgR}, ${bgG}, ${bgB}, ${bgA.toFixed(2)})`,
      border: `rgba(${borderR}, ${borderG}, ${borderB}, ${borderA.toFixed(2)})`,
      text: dominantColor.text,
      dominantEmotion: dominant.emotion,
    };
  }

  return {
    ...dominantColor,
    dominantEmotion: dominant.emotion,
  };
}

/**
 * Get CSS style object for a node based on emotion scores
 */
export function getEmotionStyle(emotionScores: EmotionScore[] | null | undefined): {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
} {
  if (!emotionScores || emotionScores.length === 0) {
    return {};
  }

  const colors = calculateBlendedColor(emotionScores);
  const dominant = getDominantEmotion(emotionScores);

  return {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: dominant && dominant.score > 0.3 ? '2px' : '1px',
    borderStyle: 'solid',
  };
}

/**
 * Get CSS class name for emotion visualization
 */
export function getEmotionClassName(emotionScores: EmotionScore[] | null | undefined): string {
  if (!emotionScores || emotionScores.length === 0) {
    return '';
  }

  const dominant = getDominantEmotion(emotionScores);
  if (!dominant || dominant.score < 0.1) {
    return '';
  }

  return `emotion-${dominant.emotion.toLowerCase()}`;
}

