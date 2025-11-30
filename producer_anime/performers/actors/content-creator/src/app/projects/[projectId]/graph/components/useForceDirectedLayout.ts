/**
 * Force-directed + Layer Layout Hook for React Flow
 * React Flow用のForce-directed + Layerレイアウトフック
 */

import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, ContextLayer } from './types';

interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  temperature?: number;
  damping?: number;
}

const MIN_NODE_DISTANCE = 100; // ノード間の最小距離（ノードサイズ50px + 余白50px）
const NODE_SIZE = 50; // ノードのサイズ

/**
 * 衝突を検出する関数
 */
function detectCollisions(
  positions: Map<string, { x: number; y: number }>,
  minDistance: number
): Array<{ node1: string; node2: string; distance: number }> {
  const collisions: Array<{ node1: string; node2: string; distance: number }> = [];
  const nodeIds = Array.from(positions.keys());

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const node1 = nodeIds[i];
      const node2 = nodeIds[j];
      if (!node1 || !node2) continue;
      const pos1 = positions.get(node1);
      const pos2 = positions.get(node2);

      if (!pos1 || !pos2) continue;

      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        collisions.push({ node1, node2, distance });
      }
    }
  }

  return collisions;
}

/**
 * グリッドベースの初期配置を生成
 */
function generateGridPosition(
  index: number,
  totalNodes: number,
  width: number,
  height: number,
  startY: number,
  minDistance: number
): { x: number; y: number } {
  const nodesPerRow = Math.ceil(Math.sqrt(totalNodes));
  const row = Math.floor(index / nodesPerRow);
  const col = index % nodesPerRow;
  
  const spacing = Math.max(minDistance, (width - 100) / nodesPerRow);
  const x = 50 + col * spacing;
  const y = startY + row * spacing;

  return { x, y };
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

    // 各context layer内のノードを配置（グリッドベース、重なりなし）
    // 複数のコンテクストレイヤーへの所属をサポート
    layers.forEach((layer) => {
      const layerNodes = nonContextNodes.filter(n => {
        const nodeData = n.data as GraphNodeData;
        // contextIds配列を優先、なければcontextIdを使用
        if (nodeData.contextIds && nodeData.contextIds.length > 0) {
          return nodeData.contextIds.includes(layer.contextNodeId);
        }
        return nodeData.contextId === layer.contextNodeId;
      });
      const contextNode = nodes.find(n => n.id === layer.contextNodeId);
      if (!contextNode) return;

      const contextX = positions.get(contextNode.id)?.x || width / 2;
      const contextY = positions.get(contextNode.id)?.y || layerPadding;
      const depth = Math.max(1, (layerNodes[0]?.data as any)?.depth || 1);
      
      // グリッドベースの配置
      layerNodes.forEach((node, index) => {
        const gridPos = generateGridPosition(
          index,
          layerNodes.length,
          width * 0.8, // コンテキスト周辺の80%の幅を使用
          layerHeight,
          contextY + 80,
          MIN_NODE_DISTANCE
        );
        
        // コンテキストノードを中心に配置
        positions.set(node.id, {
          x: contextX - (width * 0.4) + gridPos.x,
          y: contextY + depth * layerHeight + gridPos.y - 80,
        });
      });
    });

    // Contextに属さないノードの配置（グリッドベース、重なりなし）
    const orphanNodes = nonContextNodes.filter(n => !(n.data as any).contextId);
    orphanNodes.forEach((node, index) => {
      if (!positions.has(node.id)) {
        const gridPos = generateGridPosition(
          index,
          orphanNodes.length,
          width,
          height - layerPadding - 100,
          layerPadding + ((node.data as any).depth || 1) * layerHeight,
          MIN_NODE_DISTANCE
        );
        positions.set(node.id, gridPos);
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

      // 反発力（全ノード間）- 最小距離を考慮
      nodes.forEach((node1, i) => {
        nodes.slice(i + 1).forEach(node2 => {
          const pos1 = positions.get(node1.id)!;
          const pos2 = positions.get(node2.id)!;
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
          
          // 最小距離未満の場合は強い反発力を適用
          let force: number;
          if (distance < MIN_NODE_DISTANCE) {
            // 衝突している場合は強制的に分離
            force = (MIN_NODE_DISTANCE - distance) * 10; // 強い反発力
          } else {
            // 通常の反発力
            force = k * k / distance;
          }
          
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

      // 衝突検出と強制的な分離
      const collisions = detectCollisions(positions, MIN_NODE_DISTANCE);
      collisions.forEach(collision => {
        const pos1 = positions.get(collision.node1)!;
        const pos2 = positions.get(collision.node2)!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
        
        // 最小距離まで分離
        const separation = (MIN_NODE_DISTANCE - distance) / 2;
        const separationX = (dx / distance) * separation;
        const separationY = (dy / distance) * separation;
        
        pos1.x -= separationX;
        pos1.y -= separationY;
        pos2.x += separationX;
        pos2.y += separationY;
        
        // 境界制約を再適用
        pos1.x = Math.max(30, Math.min(width - 30, pos1.x));
        pos1.y = Math.max(30, Math.min(height - 30, pos1.y));
        pos2.x = Math.max(30, Math.min(width - 30, pos2.x));
        pos2.y = Math.max(30, Math.min(height - 30, pos2.y));
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

