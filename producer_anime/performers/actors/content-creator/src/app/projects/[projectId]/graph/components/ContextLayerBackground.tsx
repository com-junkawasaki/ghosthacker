/**
 * Context Layer Background Component
 * Context layerの背景を描画するカスタムレイヤー
 */

import { useMemo } from 'react';
import { useReactFlow, ReactFlowState, useViewport } from 'reactflow';
import { useStore } from 'reactflow';

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface ContextLayerBackgroundProps {
  layers: ContextLayer[];
  isDarkMode: boolean;
}

// ノードの位置を取得するセレクタ
const nodesSelector = (state: ReactFlowState) => state.nodes;

function ContextLayerBackground({ layers, isDarkMode }: ContextLayerBackgroundProps) {
  const nodes = useStore(nodesSelector);
  const viewport = useViewport();

  const layerRects = useMemo(() => {
    return layers.map(layer => {
      const contextNode = nodes.find(n => n.id === layer.contextNodeId);
      if (!contextNode) return null;

      const layerNodes = nodes.filter(n => 
        layer.containedNodeIds.includes(n.id)
      );

      if (layerNodes.length === 0) return null;

      // すべてのノード位置を含む境界を計算
      const allNodes = [contextNode, ...layerNodes];
      const positions = allNodes.map(n => ({
        x: n.position.x,
        y: n.position.y,
        width: 60, // ノードの推定幅
        height: 60, // ノードの推定高さ
      }));

      const minX = Math.min(...positions.map(p => p.x)) - 40;
      const maxX = Math.max(...positions.map(p => p.x + p.width)) + 40;
      const minY = Math.min(...positions.map(p => p.y)) - 40;
      const maxY = Math.max(...positions.map(p => p.y + p.height)) + 40;

      return {
        layer,
        bounds: { minX, minY, maxX, maxY },
        contextNode,
      };
    }).filter(Boolean) as Array<{
      layer: ContextLayer;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      contextNode: typeof nodes[0];
    }>;
  }, [layers, nodes]);

  if (layerRects.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <pattern id="context-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="10" y2="10" stroke={isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)'} strokeWidth="1" />
        </pattern>
      </defs>
      {layerRects.map(({ layer, bounds, contextNode }) => (
        <g key={layer.contextNodeId}>
          {/* 背景矩形 */}
          <rect
            x={bounds.minX * viewport.zoom + viewport.x}
            y={bounds.minY * viewport.zoom + viewport.y}
            width={(bounds.maxX - bounds.minX) * viewport.zoom}
            height={(bounds.maxY - bounds.minY) * viewport.zoom}
            fill={isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.15)'}
            stroke={isDarkMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.5)'}
            strokeWidth={2 * viewport.zoom}
            strokeDasharray={`${5 * viewport.zoom} ${5 * viewport.zoom}`}
            rx={8 * viewport.zoom}
            ry={8 * viewport.zoom}
          />
          {/* ラベル */}
          <text
            x={bounds.minX * viewport.zoom + viewport.x + 5 * viewport.zoom}
            y={(bounds.minY * viewport.zoom + viewport.y - 5 * viewport.zoom)}
            fill={isDarkMode ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.9)'}
            fontSize={11 * viewport.zoom}
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            Context: {contextNode.data.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default ContextLayerBackground;

