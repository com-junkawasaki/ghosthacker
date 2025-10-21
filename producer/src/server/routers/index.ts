import { router } from '../trpc';
import { canvasRouter } from './canvas';
import { pipelineRouter } from './pipeline';
import { storyRouter } from './story';

export const appRouter = router({
  canvas: canvasRouter,
  pipeline: pipelineRouter,
  story: storyRouter,
});

export type AppRouter = typeof appRouter;


