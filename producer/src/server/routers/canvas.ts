import { router, publicProcedure } from '../trpc';
import { storyRepository } from '@/lib/story-neo4j';
import { deriveCanvasConfig } from '@/lib/mapping';

const PROJECT_ID = 'ghost-hacker-project';

export const canvasRouter = router({
  getCanvas: publicProcedure.query(async () => {
    const saved = await storyRepository.getCanvas(PROJECT_ID);
    if (saved) return saved;
    // fallback derive from current saved entities
    const [p, n, s, pl] = await Promise.all([
      storyRepository.getProject(PROJECT_ID),
      storyRepository.getNarrative(PROJECT_ID),
      storyRepository.getStyles(PROJECT_ID),
      storyRepository.getPlatforms(PROJECT_ID),
    ]);
    return deriveCanvasConfig({
      project: p ? { title: p.title } : undefined,
      narrative: n ? { beats: n.beats } : undefined,
      styles: s ? { visual: s.visual, audio: s.audio } : undefined,
      platforms: pl ?? undefined,
    });
  }),
  seed: publicProcedure.mutation(async () => {
    const [p, n, s, pl] = await Promise.all([
      storyRepository.getProject(PROJECT_ID),
      storyRepository.getNarrative(PROJECT_ID),
      storyRepository.getStyles(PROJECT_ID),
      storyRepository.getPlatforms(PROJECT_ID),
    ]);
    const config = deriveCanvasConfig({
      project: p ? { title: p.title } : undefined,
      narrative: n ? { beats: n.beats } : undefined,
      styles: s ? { visual: s.visual, audio: s.audio } : undefined,
      platforms: pl ?? undefined,
    });
    await storyRepository.saveCanvas(PROJECT_ID, config);
    return { ok: true } as const;
  }),
});


