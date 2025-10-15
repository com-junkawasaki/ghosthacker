import { router } from '../trpc';
import { canvasRouter } from './canvas';

export const appRouter = router({
  canvas: canvasRouter,
});

export type AppRouter = typeof appRouter;


