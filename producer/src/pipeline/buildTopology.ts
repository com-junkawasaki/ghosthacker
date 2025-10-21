import type { Node, Edge } from '@reactflow/core';

export type ExecutionPlan = {
  executionOrder: string[][];
  dependencies: Map<string, string[]>;
};

export function buildExecutionPlan(nodes: Node[], edges: Edge[]): ExecutionPlan {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const nodeMap = new Map<string, Node>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
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

  if (executionOrder.flat().length !== nodes.length) {
    throw new Error('Cycle detected in graph, cannot determine execution order.');
  }

  return { executionOrder, dependencies };
}
