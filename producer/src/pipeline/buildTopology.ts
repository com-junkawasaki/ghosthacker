import type { StoryTopology } from "./types";
import type { PipelineNode } from "../ontology/schema";

export type ExecutionPlan = {
  executionOrder: string[][];
  dependencies: Map<string, string[]>;
};

export function buildExecutionPlan(topology: StoryTopology): ExecutionPlan {
  // Extract pipeline nodes from JSON-LD graph
  const pipelineNodes = topology["@graph"].filter(
    (node): node is PipelineNode => node["@type"] === "gh:PipelineNode"
  );

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const nodeMap = new Map<string, PipelineNode>();

  // Initialize nodes
  for (const node of pipelineNodes) {
    const nodeId = node["@id"];
    inDegree.set(nodeId, 0);
    adj.set(nodeId, []);
    nodeMap.set(nodeId, node);
  }

  // Build dependency graph from depends_on relationships
  for (const node of pipelineNodes) {
    const nodeId = node["@id"];
    const dependsOn = node["gh:depends_on"];

    if (dependsOn) {
      for (const dep of dependsOn) {
        const depId = dep["@id"];
        adj.get(depId)?.push(nodeId);
        inDegree.set(nodeId, (inDegree.get(nodeId) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const executionOrder: string[][] = [];
  const dependencies = new Map<string, string[]>();

  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel: string[] = [];

    for (let i = 0; i < levelSize; i++) {
      const u = queue.shift();
      if (!u) continue;
      currentLevel.push(u);

      for (const v of adj.get(u) ?? []) {
        inDegree.set(v, (inDegree.get(v) ?? 0) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }

        const deps = dependencies.get(v) ?? [];
        dependencies.set(v, [...deps, u]);
      }
    }
    executionOrder.push(currentLevel);
  }

  const processedNodes = executionOrder.flat();
  if (processedNodes.length !== pipelineNodes.length) {
    const allNodeIds = pipelineNodes.map(n => n["@id"]);
    const unprocessedNodes = allNodeIds.filter(id => !processedNodes.includes(id));
    console.error('Unprocessed nodes (possible cycle or missing dependencies):', unprocessedNodes);
    console.error('Processed nodes:', processedNodes);
    console.error('All nodes:', allNodeIds);
    throw new Error(`Cycle detected in graph or missing dependencies. Unprocessed nodes: ${unprocessedNodes.join(', ')}`);
  }

  return { executionOrder, dependencies };
}
