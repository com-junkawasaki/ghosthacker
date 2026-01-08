export type EmotionVector = Record<string, number>;

/**
 * Combines multiple emotion vectors into a single vector by summing their scores.
 * @param vectors Array of emotion vectors to combine
 * @returns A single combined emotion vector
 */
export function combineEmotionVectors(vectors: EmotionVector[]): EmotionVector {
  const result: EmotionVector = {};

  for (const vector of vectors) {
    for (const [emotion, score] of Object.entries(vector)) {
      result[emotion] = (result[emotion] || 0) + score;
    }
  }

  return result;
}

