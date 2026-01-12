import type { Node } from './stores/graph.svelte';

export interface FlattenedNode {
  id: string;
  label: string;
  depth: number;
  group: string;
  hasChildren: boolean;
  isExpanded: boolean;
  node: Node;
}

export function flattenTree(
  nodeIds: string[],
  nodeMap: Map<string, Node>,
  expandedNodes: Set<string>,
  depth = 0,
  result: FlattenedNode[] = []
): FlattenedNode[] {
  for (const id of nodeIds) {
    const node = nodeMap.get(id);
    if (!node) continue;

    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedNodes.has(id);

    result.push({
      id,
      label: node.label,
      depth,
      group: node.group,
      hasChildren,
      isExpanded,
      node
    });

    if (hasChildren && isExpanded) {
      flattenTree(node.children!, nodeMap, expandedNodes, depth + 1, result);
    }
  }
  return result;
}

