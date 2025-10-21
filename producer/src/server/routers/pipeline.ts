import { router, publicProcedure } from "../trpc";
import { runPipeline } from "@/pipeline/executor";
import { loadTopology } from "@/pipeline/loadTopology";

export const pipelineRouter = router({
  run: publicProcedure.mutation(async () => {
    const topology = loadTopology();
    await runPipeline(topology);
    return { ok: true } as const;
  }),
});


