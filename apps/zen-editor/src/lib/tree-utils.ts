import type { Node, Edge } from './stores/graph.svelte';

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
  expandedNodes: string[],
  depth = 0,
  result: FlattenedNode[] = []
): FlattenedNode[] {
  for (const id of nodeIds) {
    const node = nodeMap.get(id);
    if (!node) continue;

    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedNodes.includes(id);

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

/**
 * Calculates hierarchical circular layout positions.
 * Higher level nodes are in the center or spaced out,
 * children are placed in sectors around their parents.
 */
export function calculateHierarchicalPositions(
  nodes: Map<string, Node>,
  edges: Edge[],
  rootIds: string[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  const layoutNode = (id: string, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
    const node = nodes.get(id);
    if (!node) return;

    // Use existing position if available, otherwise calculate
    if (node.x !== undefined && node.y !== undefined && node.x !== 0 && node.y !== 0) {
      positions.set(id, { x: node.x, y: node.y });
    } else {
      const angle = (startAngle + endAngle) / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.set(id, { x, y });
    }

    const children = node.children || [];
    if (children.length > 0) {
      const childRadius = radius * 0.5 + 100; // Distance from parent
      const angleStep = (endAngle - startAngle) / children.length;
      
      children.forEach((childId, i) => {
        const sAngle = startAngle + i * angleStep;
        const eAngle = startAngle + (i + 1) * angleStep;
        const pos = positions.get(id)!;
        layoutNode(childId, pos.x, pos.y, 80, sAngle, eAngle); // Nested radius
      });
    }
  };

  // Space out root circles
  const rootRadius = 400;
  rootIds.forEach((id, i) => {
    const angle = (i / rootIds.length) * 2 * Math.PI;
    const nextAngle = ((i + 1) / rootIds.length) * 2 * Math.PI;
    layoutNode(id, 0, 0, rootRadius, angle, nextAngle);
  });

  return positions;
}

