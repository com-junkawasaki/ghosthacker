import { env } from "@/env";
import { createGraphContext } from "@/lib/graphContext";
import { withNodeSpan } from "@/observability/otel";
import { providers } from "@/lib/ai/providers";
import { ensureOutputs } from "@/schemas/nodes";
import type { GenericNode, StoryTopology } from "./types";
import { saveArtifact } from "@/infra/neo4j/artifactsRepo";

// topology is injected by caller; loader resides in API layer

const handlers: Record<string, (n: GenericNode, ctx: ReturnType<typeof createGraphContext>) => Promise<Record<string, unknown>>> = {
  SourceDoc: async (n, ctx) => ctx.loadSource(n),
  Protagonist: async (n, ctx) => ctx.upsertCharacter(n),
  Backstory: async (n, ctx) => ctx.upsertBackstory(n),
  World: async (n, ctx) => ctx.upsertWorld(n),
  Prompt: async (n, ctx) => ctx.composePrompt(n),
  Writer: async (n, ctx) => providers.text.generate(n, await ctx.buildTextContext(n)),
  ImageGen: async (n, ctx) => providers.image.generate(n, await ctx.buildImageContext(n)),
  WebtoonPanelGen: async (n, ctx) => providers.panel.generate(n, await ctx.buildPanelContext(n)),
  WebtoonLayout: async (n, ctx) => providers.layout.generate(n, await ctx.buildLayoutContext(n)),
  WebtoonExport: async (n, ctx) => providers.export.webtoon(n, await ctx.buildWebtoonExportContext(n)),
  TTS: async (n, ctx) => providers.audio.generate(n, await ctx.buildAudioContext(n)),
  VideoGen: async (n, ctx) => providers.video.generate(n, await ctx.buildVideoContext(n)),
  Render: async (n, ctx) => providers.video.render(n, await ctx.buildRenderContext(n)),
  ExportWattpad: async (n, ctx) => providers.export.wattpad(n, await ctx.buildWattpadContext(n)),
  PublishYouTube: async (n, ctx) => providers.publish.youtube(n, await ctx.buildYouTubeContext(n)),
};

export async function runPipeline(topology: StoryTopology): Promise<void> {
  void env; // ensure env tree-shaken correctness
  const ctx = createGraphContext();

  for (const step of topology.executionOrder) {
    const nodeIds = Array.isArray(step) ? step : [step];
    await Promise.all(
      nodeIds.map(async (id) => {
        const node = topology.pipeline.find((n) => n.id === id);
        if (!node) throw new Error(`Node not found: ${id}`);
        return withNodeSpan(node, async () => {
          const out = await handlers[node.type](node, ctx);
          ensureOutputs(node.type, out);
          await saveArtifact({ nodeId: node.id, nodeType: node.type, label: node.label, payload: out });
          return out;
        });
      })
    );
  }
}


