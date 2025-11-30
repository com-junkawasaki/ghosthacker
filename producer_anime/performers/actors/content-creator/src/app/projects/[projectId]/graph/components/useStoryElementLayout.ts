/**
 * Story Element Layout Hook
 * ストーリー要素タイプ別のレイアウト計算フック
 */

import { useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, StoryElementNodeType } from './types';

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface LayoutOptions {
  width: number;
  height: number;
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
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodes.filter(n => 
        layer.containedNodeIds.includes(n.id) && !n.data.isContext
      );
      
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
      const horizontalSpacing = 120;
      const verticalSpacing = 100;

      typeOrder.forEach((type, typeIndex) => {
        const typeNodes = typeGroups.get(type) || [];
        if (typeNodes.length === 0) return;

        // タイプごとに横に並べる
        const nodesPerRow = Math.min(5, typeNodes.length);
        const startX = contextX - ((nodesPerRow - 1) * horizontalSpacing) / 2;

        typeNodes.forEach((node, nodeIndex) => {
          const row = Math.floor(nodeIndex / nodesPerRow);
          const col = nodeIndex % nodesPerRow;
          
          node.position = {
            x: startX + col * horizontalSpacing + (Math.random() - 0.5) * 20,
            y: currentY + row * verticalSpacing + (Math.random() - 0.5) * 20,
          };
        });

        // 次のタイプグループのY位置を更新
        const rows = Math.ceil(typeNodes.length / nodesPerRow);
        currentY += rows * verticalSpacing + 30;
      });
    });

    // Contextに属さないノードを配置
    const orphanNodes = nodes.filter(n => 
      !n.data.isContext && 
      !layers.some(layer => layer.containedNodeIds.includes(n.id))
    );

    if (orphanNodes.length > 0) {
      const orphanSpacing = width / (orphanNodes.length + 1);
      orphanNodes.forEach((node, index) => {
        node.position = {
          x: orphanSpacing * (index + 1),
          y: height - 150,
        };
      });
    }

    return nodes;
  }, []);

  return { calculateLayout };
}

