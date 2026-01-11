import { assertEquals } from '@std/assert';
import { combineEmotionVectors } from './emotion';

Deno.test('combineEmotionVectors should return a combined vector of multiple nodes', () => {
  const vectors: Record<string, number>[] = [
    { Joy: 0.5, Calm: 0.2 },
    { Joy: 0.3, Sadness: 0.1 },
    { Anger: 0.4 }
  ];
  const result = combineEmotionVectors(vectors);
  assertEquals(result, {
    Joy: 0.8,
    Calm: 0.2,
    Sadness: 0.1,
    Anger: 0.4
  });
});

Deno.test('combineEmotionVectors should return an empty object for empty input', () => {
  assertEquals(combineEmotionVectors([]), {});
});

