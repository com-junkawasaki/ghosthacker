/**
 * Force-directed + Layer Layout Hook for React Flow
 * React Flow用のForce-directed + Layerレイアウトフック
 */

import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  temperature?: number;
  damping?: number;
}

export function useForceDirectedLayout() {
  const calculateLayout = useCallback((
    nodes: Node[],
    edges: Edge[],
    layers: ContextLayer[],
    options: LayoutOptions
  ): Node[] => {
    const { width, height, iterations = 100, temperature = width / 10, damping = 0.9 } = options;
    
    if (nodes.length === 0) return nodes;

    const positions = new Map<string, { x: number; y: number }>();
    const maxDepth = Math.max(...nodes.map(n => (n.data as any).depth || 0));
    const layerHeight = maxDepth > 0 ? height / (maxDepth + 1) : height;
    const layerPadding = 50;

    // Contextノードを各レイヤーの最上部に配置
    const contextNodes = nodes.filter(n => (n.data as any).isContext);
    const nonContextNodes = nodes.filter(n => !(n.data as any).isContext);

    // Contextノードの配置
    const contextSpacing = width / (contextNodes.length + 1);
    contextNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: contextSpacing * (index + 1),
        y: layerPadding,
      });
    });

    // 各context layer内のノードを配置
    layers.forEach((layer) => {
      const layerNodes = nonContextNodes.filter(n => (n.data as any).contextId === layer.contextNodeId);
      const contextNode = nodes.find(n => n.id === layer.contextNodeId);
      if (!contextNode) return;

      const contextX = positions.get(contextNode.id)?.x || width / 2;
      const nodesPerRow = Math.ceil(Math.sqrt(layerNodes.length));
      const nodeSpacing = Math.min(150, (width - 200) / nodesPerRow);

      layerNodes.forEach((node, index) => {
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;
        const depth = (node.data as any).depth || 1;
        
        positions.set(node.id, {
          x: contextX - (nodesPerRow * nodeSpacing) / 2 + col * nodeSpacing + (Math.random() - 0.5) * 20,
          y: layerPadding + depth * layerHeight + row * 40 + (Math.random() - 0.5) * 20,
        });
      });
    });

    // Contextに属さないノードの配置
    const orphanNodes = nonContextNodes.filter(n => !(n.data as any).contextId);
    orphanNodes.forEach((node) => {
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x: Math.random() * width,
          y: layerPadding + ((node.data as any).depth || 1) * layerHeight,
        });
      }
    });

    // Force-directed: 反復的に位置を更新
    const k = Math.sqrt((width * height) / nodes.length);
    let currentTemp = temperature;

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { fx: number; fy: number }>();
      
      nodes.forEach(node => {
        forces.set(node.id, { fx: 0, fy: 0 });
      });

      // 反発力（全ノード間）
      nodes.forEach((node1, i) => {
        nodes.slice(i + 1).forEach(node2 => {
          const pos1 = positions.get(node1.id)!;
          const pos2 = positions.get(node2.id)!;
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = k * k / distance;
          
          const fx1 = (dx / distance) * force;
          const fy1 = (dy / distance) * force;
          const fx2 = -fx1;
          const fy2 = -fy1;

          const f1 = forces.get(node1.id)!;
          const f2 = forces.get(node2.id)!;
          f1.fx -= fx1;
          f1.fy -= fy1;
          f2.fx -= fx2;
          f2.fy -= fy2;
        });
      });

      // 引力（エッジで接続されたノード間）
      edges.forEach(edge => {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = distance / k;

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        const f1 = forces.get(edge.source)!;
        const f2 = forces.get(edge.target)!;
        f1.fx += fx;
        f1.fy += fy;
        f2.fx -= fx;
        f2.fy -= fy;
      });

      // Contextノードとその下層ノード間の強い引力
      layers.forEach(layer => {
        const contextPos = positions.get(layer.contextNodeId);
        if (!contextPos) return;

        layer.containedNodeIds.forEach(nodeId => {
          const nodePos = positions.get(nodeId);
          if (!nodePos) return;

          const dx = nodePos.x - contextPos.x;
          const dy = nodePos.y - contextPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance / k) * 2; // 2倍の引力

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          const fContext = forces.get(layer.contextNodeId)!;
          const fNode = forces.get(nodeId)!;
          fContext.fx += fx;
          fContext.fy += fy;
          fNode.fx -= fx;
          fNode.fy -= fy;
        });
      });

      // 位置を更新
      nodes.forEach(node => {
        const force = forces.get(node.id)!;
        const pos = positions.get(node.id)!;
        
        pos.x += force.fx * currentTemp * damping;
        pos.y += force.fy * currentTemp * damping;

        // 境界制約
        pos.x = Math.max(30, Math.min(width - 30, pos.x));
        pos.y = Math.max(30, Math.min(height - 30, pos.y));
      });

      currentTemp *= 0.95; // 温度を下げる
    }

    // ノードの位置を更新
    return nodes.map(node => {
      const pos = positions.get(node.id);
      if (pos) {
        return {
          ...node,
          position: { x: pos.x, y: pos.y },
        };
      }
      return node;
    });
  }, []);

  return { calculateLayout };
}

