/**
 * Story Element Layout Hook
 * ストーリー要素タイプ別のレイアウト計算フック
 */

import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, StoryElementNodeType, ContextLayer } from './types';

interface LayoutOptions {
  width: number;
  height: number;
}

const MIN_NODE_DISTANCE = 100; // ノード間の最小距離
const NODE_SIZE = 50; // ノードのサイズ

/**
 * ノード間の距離をチェックし、重なりのない位置を返す
 */
function findNonOverlappingPosition(
  x: number,
  y: number,
  existingPositions: Map<string, { x: number; y: number }>,
  minDistance: number
): { x: number; y: number } {
  let newX = x;
  let newY = y;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    let hasOverlap = false;

    for (const [_, pos] of existingPositions) {
      const dx = pos.x - newX;
      const dy = pos.y - newY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        hasOverlap = true;
        // 重なっている場合、距離を保つ方向に移動
        const angle = Math.atan2(dy, dx);
        newX = pos.x - Math.cos(angle) * minDistance;
        newY = pos.y - Math.sin(angle) * minDistance;
        break;
      }
    }

    if (!hasOverlap) {
      break;
    }

    attempts++;
  }

  return { x: newX, y: newY };
}

/**
 * 要素タイプごとの初期配置を計算
 */
export function useStoryElementLayout() {
  const calculateLayout = useCallback((
    nodes: Node<GraphNodeData>[],
    edges: Edge[],
    layers: ContextLayer[],
    options: LayoutOptions
  ): Node<GraphNodeData>[] => {
    const { width, height } = options;
    
    if (nodes.length === 0) return nodes;

    // 要素タイプごとにノードをグループ化
    const nodesByType = new Map<StoryElementNodeType | 'context' | 'default', Node<GraphNodeData>[]>();
    
    nodes.forEach(node => {
      const type = node.data.isContext ? 'context' : (node.data.nodeType || 'default');
      if (!nodesByType.has(type)) {
        nodesByType.set(type, []);
      }
      nodesByType.get(type)!.push(node);
    });

    // Contextノードを最上部に配置
    const contextNodes = nodesByType.get('context') || [];
    const contextSpacing = contextNodes.length > 0 ? width / (contextNodes.length + 1) : width / 2;
    
    contextNodes.forEach((node, index) => {
      node.position = {
        x: contextSpacing * (index + 1),
        y: 50,
      };
    });

    // 各Contextレイヤー内で要素タイプ別にグループ化
    // 複数のコンテクストレイヤーへの所属をサポート
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodes.filter(n => {
        if (n.data.isContext) return false;
        // containedNodeIdsに含まれるか、contextIds/contextIdで所属を確認
        return layer.containedNodeIds.includes(n.id) ||
               (n.data.contextIds && n.data.contextIds.includes(layer.contextNodeId)) ||
               n.data.contextId === layer.contextNodeId;
      });
      
      // 要素タイプごとにグループ化
      const typeGroups = new Map<StoryElementNodeType | 'default', Node<GraphNodeData>[]>();
      layerNodes.forEach(node => {
        const type = node.data.nodeType || 'default';
        if (!typeGroups.has(type)) {
          typeGroups.set(type, []);
        }
        typeGroups.get(type)!.push(node);
      });

      // 各タイプグループを配置
      const contextNode = nodes.find(n => n.id === layer.contextNodeId);
      if (!contextNode) return;

      const contextX = contextNode.position.x;
      const contextY = contextNode.position.y;
      
      // タイプごとの配置順序
      const typeOrder: (StoryElementNodeType | 'default')[] = [
        'worldview',
        'background',
        'timeline',
        'character',
        'beat',
        'scene',
        'event',
        'default',
      ];

      let currentY = contextY + 100;
      const horizontalSpacing = Math.max(MIN_NODE_DISTANCE, 120);
      const verticalSpacing = Math.max(MIN_NODE_DISTANCE, 100);
      const existingPositions = new Map<string, { x: number; y: number }>();

      // Contextノードの位置を記録
      existingPositions.set(contextNode.id, { x: contextX, y: contextY });

      typeOrder.forEach((type, typeIndex) => {
        const typeNodes = typeGroups.get(type) || [];
        if (typeNodes.length === 0) return;

        // タイプごとに横に並べる
        const nodesPerRow = Math.min(5, typeNodes.length);
        const startX = contextX - ((nodesPerRow - 1) * horizontalSpacing) / 2;

        typeNodes.forEach((node, nodeIndex) => {
          const row = Math.floor(nodeIndex / nodesPerRow);
          const col = nodeIndex % nodesPerRow;
          
          // グリッドベースの位置を計算
          const gridX = startX + col * horizontalSpacing;
          const gridY = currentY + row * verticalSpacing;
          
          // 重なりのない位置を確保
          const position = findNonOverlappingPosition(
            gridX,
            gridY,
            existingPositions,
            MIN_NODE_DISTANCE
          );
          
          node.position = position;
          existingPositions.set(node.id, position);
        });

        // 次のタイプグループのY位置を更新
        const rows = Math.ceil(typeNodes.length / nodesPerRow);
        currentY += rows * verticalSpacing + 30;
      });
    });

    // Contextに属さないノードを配置（重なりなし）
    const orphanNodes = nodes.filter(n => 
      !n.data.isContext && 
      !layers.some(layer => layer.containedNodeIds.includes(n.id))
    );

    if (orphanNodes.length > 0) {
      const orphanSpacing = Math.max(MIN_NODE_DISTANCE, width / (orphanNodes.length + 1));
      const existingPositions = new Map<string, { x: number; y: number }>();
      
      // 既存のノード位置を記録
      nodes.forEach(n => {
        if (n.position && !orphanNodes.includes(n)) {
          existingPositions.set(n.id, n.position);
        }
      });

      orphanNodes.forEach((node, index) => {
        const gridX = orphanSpacing * (index + 1);
        const gridY = height - 150;
        
        // 重なりのない位置を確保
        const position = findNonOverlappingPosition(
          gridX,
          gridY,
          existingPositions,
          MIN_NODE_DISTANCE
        );
        
        node.position = position;
        existingPositions.set(node.id, position);
      });
    }

    return nodes;
  }, []);

  return { calculateLayout };
}

