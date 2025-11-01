import { getMongoDb } from "@/infra/mongodb/client";
import { Node } from "@reactflow/core";
import fs from "fs";
import path from "path";

type GenericNode = Node;

export type MaybePromise<T> = T | Promise<T>;

export interface NodeDefinition<T = unknown> {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  operation: (inputs: Record<string, unknown>) => MaybePromise<Record<string, unknown>>;
}

export type PipelineState = {
  __status: 'running' | 'completed' | 'error';
  [key: string]: unknown;
};

export class GraphContext {
  private executionId: string;
  private nodeDefinitions: Map<string, NodeDefinition<unknown>> = new Map();
  private state: PipelineState = { __status: 'running' };
  private activePromises: Set<Promise<void>> = new Set();

  constructor(executionId?: string) {
    this.executionId = executionId ?? `exec-${Date.now()}`;
  }

  defineNode<T>(type: string, definition: NodeDefinition<unknown>): this {
    if (this.nodeDefinitions.has(type)) {
      throw new Error(`Node type "${type}" is already defined.`);
    }
    this.nodeDefinitions.set(type, definition);
    return this;
  }

  async execute(graph: {
    nodes: { id: string, type: string, data: Record<string, unknown> }[];
    edges: { source: string, target: string }[];
  }): Promise<Record<string, unknown>> {
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const adj: Record<string, string[]> = Object.fromEntries(graph.nodes.map((n) => [n.id, []]));

    // Build adjacency list
    graph.edges.forEach(({ source, target }) => {
      adj[source].push(target);
    });

    const visited: Set<string> = new Set();
    const stack: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      stack.push(nodeId);
      adj[nodeId].forEach(visit);
    };

    // Start DFS from any node that is not a dependency
    const startNodes = graph.nodes.filter(
      (n) => !graph.edges.some((e) => e.target === n.id)
    );

    if (startNodes.length === 0) {
      throw new Error("No starting nodes found in the graph.");
    }

    startNodes.forEach((node) => visit(node.id));

    const result: Record<string, unknown> = {};

    for (const nodeId of stack) {
      const node = nodeMap.get(nodeId);
      if (!node) {
        throw new Error(`Node with ID "${nodeId}" not found.`);
      }

      const definition = this.nodeDefinitions.get(node.type);
      if (!definition) {
        throw new Error(`Node type "${node.type}" not defined.`);
      }

      const inputs = await Promise.all(
        Object.entries(definition.inputs).map(([key]) => {
          const dependencyNode = graph.nodes.find((n) => n.id === key);
          if (!dependencyNode) {
            throw new Error(`Dependency node with ID "${key}" not found.`);
          }
          return this.execute(
            {
              nodes: graph.nodes.filter((n) => n.id !== nodeId),
              edges: graph.edges.filter(
                (e) => e.source !== key && e.target !== nodeId
              ),
            }
          );
        })
      );

      const operationResult = await definition.operation(
        Object.fromEntries(
          Object.entries(definition.inputs).map(([key], index) => [
            key,
            inputs[index],
          ])
        )
      );

      result[nodeId] = operationResult;
    }

    return result;
  }
}

export function createGraphContext() {
  async function fetchCharacterBundle(name: string) {
    const db = await getMongoDb();
    const collection = db.collection('story_characters');
    const doc = await collection.findOne({ name });
    return doc ? doc : null;
  }

  return {
    // Context builders for RAG/prompts per modality
    async buildTextContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { lore: await fetchCharacterBundle("Akito") }; },
    async buildImageContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { style: "atmospheric-horror" }; },
    async buildAudioContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { voice: "alloy" }; },
    async buildVideoContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { duration: 300, aspect: "9:16" }; },
    async buildPanelContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildLayoutContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildWebtoonExportContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildRenderContext(_n: GenericNode, _inputs: Record<string, unknown>) { return {}; },
    async buildWattpadContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { includeImages: true }; },
    async buildYouTubeContext(_n: GenericNode, _inputs: Record<string, unknown>) { return { privacy: "unlisted" }; },

    // Node persistence/derivation placeholders
    async upsertCharacter(n: GenericNode) {
      const db = await getMongoDb();
      const collection = db.collection('story_characters');
      const id = n.id;
      const name = (n.data?.config?.name as string) ?? "Akito";
      await collection.updateOne(
        { id },
        { $set: { id, name, updatedAt: new Date() } },
        { upsert: true }
      );
      return { name };
    },
    async upsertBackstory(n: GenericNode) {
      const db = await getMongoDb();
      const collection = db.collection('story_backstories');
      const id = n.id;
      const origin = (n.data?.config?.origin as string) ?? "";
      const motivation = (n.data?.config?.motivation as string) ?? "";
      const conflict = (n.data?.config?.conflict as string) ?? "";
      await collection.updateOne(
        { id },
        { $set: { id, origin, motivation, conflict, updatedAt: new Date() } },
        { upsert: true }
      );
      return { origin, motivation, conflict };
    },
    async upsertWorld(n: GenericNode) {
      const db = await getMongoDb();
      const collection = db.collection('story_worlds');
      const id = n.id;
      const setting = (n.data?.config?.setting as string) ?? "Near-future Tokyo";
      const era = (n.data?.config?.era as string) ?? "2042";
      const rules = (n.data?.config?.rules as string) ?? "Ghost-net protocols";
      await collection.updateOne(
        { id },
        { $set: { id, setting, era, rules, updatedAt: new Date() } },
        { upsert: true }
      );
      return { setting, era, rules };
    },
    async loadSource(n: GenericNode) {
      const sourcePath = n.data?.config?.sourcePath as string;
      if (!sourcePath) return { draft: "// Source path not configured" };

      try {
        const fullPath = path.resolve(process.cwd(), '..', sourcePath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        return { draft: content };
      } catch (error) {
        console.error(`Failed to load source file: ${sourcePath}`, error);
        return { draft: `// Failed to load: ${sourcePath}` };
      }
    },

    async loadStoryGraph(n: GenericNode) {
      const episodeId = n.data?.config?.episodeId as string;
      if (!episodeId) throw new Error("Episode ID not configured for StoryGraph node");

      const db = await getMongoDb();
      const episodesCollection = db.collection('story_episodes');
      const episode = await episodesCollection.findOne({ episodeId });

      if (!episode) {
        throw new Error(`Episode not found: ${episodeId}`);
      }

      // For MongoDB, we'll return the episode data directly
      // Scenes and characters can be stored as arrays in the episode document if needed
      return {
        graphData: {
          episode,
          scenes: episode.scenes || [],
          characters: episode.characters || [],
        }
      };
    },

    async loadNarrative(n: GenericNode) {
      const config = n.data?.config;
      if (!config) throw new Error("Narrative configuration not found");

      return {
        synopsis: config.synopsis,
        structure: config.structure,
        beats: config.beats
      };
    },
    async composePrompt(n: GenericNode, inputs: Record<string, unknown>) {
      // Combine inputs from dependency nodes into a structured prompt context
      const sourceDrafts = Object.values(inputs).map(i => (i as { draft?: string })?.draft).filter(Boolean);
      const characters = Object.values(inputs).map(i => (i as { name?: string })?.name).filter(Boolean);
      
      const promptContext = {
        style: n.data?.config?.style ?? "atmospheric",
        inputs: {
          sources: sourceDrafts,
          characters: characters,
          backstory: (inputs as { backstory: unknown }).backstory,
          world: (inputs as { world: unknown }).world,
        }
      };

      const prompt = `
        Based on the following context, generate a story.
        Style: ${promptContext.style}
        Characters: ${promptContext.inputs.characters.join(', ')}
        World: ${JSON.stringify(promptContext.inputs.world, null, 2)}
        ---
        ${sourceDrafts.join('\n\n')}
      `;

      return { prompt };
    },
  };
}


