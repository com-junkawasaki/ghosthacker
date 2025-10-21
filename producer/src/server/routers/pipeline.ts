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
    .input(z.object({
        nodes: z.array(NodeSchema),
        edges: z.array(EdgeSchema),
    }))
    .mutation(async ({ input }) => {
        await runPipeline(input.nodes as Node[], input.edges as Edge[]);
        return { ok: true } as const;
  }),
});


