import { env } from "@/env";
import { createGraphContext } from "@/lib/graphContext";
import { withNodeSpan } from "@/observability/otel";
import { providers } from "@/lib/ai/providers";
import { ensureOutputs } from "@/schemas/nodes";
import { saveArtifact } from "@/infra/neo4j/artifactsRepo";
import { buildExecutionPlan } from "./buildTopology";
import type { Node, Edge } from "@reactflow/core";

const handlers: Record<string, (n: Node, inputs: Record<string, unknown>, ctx: ReturnType<typeof createGraphContext>) => Promise<Record<string, unknown>>> = {
  SourceDoc: async (n, _, ctx) => ctx.loadSource(n),
  Protagonist: async (n, _, ctx) => ctx.upsertCharacter(n),
  Backstory: async (n, _, ctx) => ctx.upsertBackstory(n),
  World: async (n, _, ctx) => ctx.upsertWorld(n),
  Prompt: async (n, inputs, ctx) => ctx.composePrompt(n, inputs),
  Writer: async (n, inputs, ctx) => providers.text.generate(n, await ctx.buildTextContext(n, inputs)),
  ImageGen: async (n, inputs, ctx) => providers.image.generate(n, await ctx.buildImageContext(n, inputs)),
  WebtoonPanelGen: async (n, inputs, ctx) => providers.panel.generate(n, await ctx.buildPanelContext(n, inputs)),
  WebtoonLayout: async (n, inputs, ctx) => providers.layout.generate(n, await ctx.buildLayoutContext(n, inputs)),
  WebtoonExport: async (n, inputs, ctx) => providers.export.webtoon(n, await ctx.buildWebtoonExportContext(n, inputs)),
  TTS: async (n, inputs, ctx) => providers.audio.generate(n, await ctx.buildAudioContext(n, inputs)),
  VideoGen: async (n, inputs, ctx) => providers.video.generate(n, await ctx.buildVideoContext(n, inputs)),
  Render: async (n, inputs, ctx) => providers.video.render(n, await ctx.buildRenderContext(n, inputs)),
  ExportWattpad: async (n, inputs, ctx) => providers.export.wattpad(n, await ctx.buildWattpadContext(n, inputs)),
  PublishYouTube: async (n, inputs, ctx) => providers.publish.youtube(n, await ctx.buildYouTubeContext(n, inputs)),
};

export async function runPipeline(nodes: Node[], edges: Edge[]): Promise<void> {
  void env; // ensure env tree-shaken correctness
  const ctx = createGraphContext();
  const { executionOrder, dependencies } = buildExecutionPlan(nodes, edges);
  const artifacts = new Map<string, unknown>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const level of executionOrder) {
    await Promise.all(
      level.map(async (id) => {
        const node = nodeMap.get(id);
        if (!node || !node.type) throw new Error(`Node not found or has no type: ${id}`);
        
        const nodeDependencies = dependencies.get(id) ?? [];
        const inputs = nodeDependencies.reduce((acc, depId) => {
            acc[depId] = artifacts.get(depId);
            return acc;
        }, {} as Record<string, unknown>);

        return withNodeSpan({id: node.id, type: node.type }, async () => {
          const out = await handlers[node.type!](node, inputs, ctx);
          ensureOutputs(node.type!, out);
          artifacts.set(id, out);
          await saveArtifact({ nodeId: node.id, nodeType: node.type!, label: node.data.label, payload: out });
          return out;
        });
      })
    );
  }
}


