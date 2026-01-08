import { describe, it, expect } from 'vitest';
import { combineEmotionVectors } from './emotion';

describe('combineEmotionVectors', () => {
  it('should return a combined vector of multiple nodes', () => {
    const vectors = [
      { Joy: 0.5, Calm: 0.2 },
      { Joy: 0.3, Sadness: 0.1 },
      { Anger: 0.4 }
    ];
    const result = combineEmotionVectors(vectors);
    expect(result).toEqual({
      Joy: 0.8,
      Calm: 0.2,
      Sadness: 0.1,
      Anger: 0.4
    });
  });

  it('should return an empty object for empty input', () => {
    expect(combineEmotionVectors([])).toEqual({});
  });
});

