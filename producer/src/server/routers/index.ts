import { router } from '../trpc';
import { canvasRouter } from './canvas';
import { pipelineRouter } from './pipeline';
import { storyRouter } from './story';
import { projectsRouter } from './projects';

export const appRouter = router({
  canvas: canvasRouter,
  pipeline: pipelineRouter,
  story: storyRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;


