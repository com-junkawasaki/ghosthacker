import { env } from "@/env";
import { createGraphContext } from "@/lib/graphContext";
import { traceAsync } from "@/observability/otel";
import { providers } from "@/lib/ai/providers";
import { ensureOutputs } from "@/schemas/nodes";
import { saveArtifact } from "@/infra/neo4j/artifactsRepo";
import { buildExecutionPlan } from "./buildTopology";
import type { StoryTopology } from "./types";
import type { PipelineNode } from "../ontology/schema";

// Convert PipelineNode to a format compatible with existing handlers
type CompatibleNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, unknown>;
  };
};

const handlers: Record<string, (n: CompatibleNode, inputs: Record<string, unknown>, ctx: ReturnType<typeof createGraphContext>) => Promise<Record<string, unknown>>> = {
  SourceDoc: async (n, _, ctx) => ctx.loadSource(n),
  Protagonist: async (n, _, ctx) => ctx.upsertCharacter(n),
  Backstory: async (n, _, ctx) => ctx.upsertBackstory(n),
  World: async (n, _, ctx) => ctx.upsertWorld(n),
  StoryGraph: async (n, _, ctx) => ctx.loadStoryGraph(n),
  Narrative: async (n, _, ctx) => ctx.loadNarrative(n),
  Prompt: async (n, inputs, ctx) => ctx.composePrompt(n, inputs),
  Writer: async (n, inputs, ctx) => {
    const promptInput = inputs[Object.keys(inputs)[0]] as { prompt: string };
    if (!promptInput || !promptInput.prompt) {
      throw new Error("Prompt not found in inputs for Writer node");
    }
    return providers.text.generate(n, promptInput.prompt, await ctx.buildTextContext(n, inputs));
  },
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

function convertPipelineNode(node: PipelineNode): CompatibleNode {
  return {
    id: node["@id"],
    type: node["gh:node_type"],
    position: { x: 0, y: 0 }, // Default position for JSON-LD nodes
    data: {
      label: node["gh:node_label"],
      config: node["gh:config"] as Record<string, unknown>,
    },
  };
}

export async function runPipeline(topology: StoryTopology): Promise<void> {
  void env; // ensure env tree-shaken correctness
  const ctx = createGraphContext();
  const { executionOrder, dependencies } = buildExecutionPlan(topology);
  const artifacts = new Map<string, unknown>();

  // Extract pipeline nodes from JSON-LD graph
  const pipelineNodes = topology["@graph"].filter(
    (node): node is PipelineNode => node["@type"] === "gh:PipelineNode"
  );
  const nodeMap = new Map(pipelineNodes.map(n => [n["@id"], convertPipelineNode(n)]));

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

        return traceAsync(`node:${node.id}`, async () => {
          if (!node.type) throw new Error(`Node type is undefined for node: ${id}`);
          const out = await handlers[node.type](node, inputs, ctx);
          ensureOutputs(node.type, out);
          artifacts.set(id, out);
          await saveArtifact({ nodeId: node.id, nodeType: node.type, label: node.data.label, payload: out });
          return out;
        });
      })
    );
  }
}


