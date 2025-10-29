import { router, publicProcedure } from "../trpc";
import { runPipeline } from "@/pipeline/executor";
import { z } from 'zod';
import type { Node, Edge } from '@reactflow/core';

const NodeSchema = z.object({
  id: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.any(),
  type: z.string().optional(),
});

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const pipelineRouter = router({
  run: publicProcedure
    .mutation(async () => {
        // Load topology from JSON-LD and run pipeline
        const { loadTopology } = await import("../../pipeline/loadTopology");
        const { runPipeline } = await import("../../pipeline/executor");
        const topology = loadTopology();
        await runPipeline(topology);
        return { ok: true } as const;
  }),
});


