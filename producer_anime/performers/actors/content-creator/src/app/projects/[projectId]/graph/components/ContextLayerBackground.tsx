/**
 * Context Layer Background Component
 * Context layerの背景を描画するカスタムレイヤー
 */

import { useMemo } from 'react';
import { useReactFlow, useViewport } from 'reactflow';
import { ContextLayer } from './types';

interface ContextLayerBackgroundProps {
  layers: ContextLayer[];
  isDarkMode: boolean;
}

function ContextLayerBackground({ layers, isDarkMode }: ContextLayerBackgroundProps) {
  const { getNodes } = useReactFlow();
  const nodes = getNodes();
  const viewport = useViewport();

  const layerRects = useMemo(() => {
    // visibleフラグでフィルタリング
    const visibleLayers = layers.filter(layer => layer.visible !== false);
    
    return visibleLayers.map((layer, index) => {
      const contextNode = nodes.find(n => n.id === layer.contextNodeId);
      if (!contextNode) return null;

      const layerNodes = nodes.filter(n => 
        layer.containedNodeIds.includes(n.id)
      );

      if (layerNodes.length === 0) return null;
      
      // レイヤーの色を決定（複数レイヤーに属するノードの重複表示に対応）
      const layerColor = layer.color || (isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.15)');
      const layerStrokeColor = layer.color || (isDarkMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.5)');

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
        layerColor,
        layerStrokeColor,
        zIndex: index,
      };
    }).filter(Boolean) as Array<{
      layer: ContextLayer;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      contextNode: typeof nodes[0];
      layerColor: string;
      layerStrokeColor: string;
      zIndex: number;
    }>;
  }, [layers, nodes, isDarkMode]);

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
      {layerRects.map(({ layer, bounds, contextNode, layerColor, layerStrokeColor, zIndex }) => (
        <g key={layer.contextNodeId} style={{ zIndex }}>
          {/* 背景矩形 */}
          <rect
            x={bounds.minX * viewport.zoom + viewport.x}
            y={bounds.minY * viewport.zoom + viewport.y}
            width={(bounds.maxX - bounds.minX) * viewport.zoom}
            height={(bounds.maxY - bounds.minY) * viewport.zoom}
            fill={layerColor}
            stroke={layerStrokeColor}
            strokeWidth={2 * viewport.zoom}
            strokeDasharray={`${5 * viewport.zoom} ${5 * viewport.zoom}`}
            rx={8 * viewport.zoom}
            ry={8 * viewport.zoom}
            opacity={0.8}
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

