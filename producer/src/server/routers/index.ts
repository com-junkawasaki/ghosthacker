import { router } from '../trpc';
import { canvasRouter } from './canvas';
import { pipelineRouter } from './pipeline';

export const appRouter = router({
  canvas: canvasRouter,
  pipeline: pipelineRouter,
});

export type AppRouter = typeof appRouter;


