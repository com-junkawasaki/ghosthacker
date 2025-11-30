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

const MIN_NODE_DISTANCE = 120; // ノード間の最小距離（ノードサイズ50px + 余白70px）- より広い間隔
const NODE_SIZE = 50; // ノードのサイズ
const DEFAULT_ITERATIONS = 150; // デフォルトの反復回数（より多くの反復で安定した配置）
const DEFAULT_DAMPING = 0.85; // ダンピング係数（より滑らかな動き）

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

/**
 * レイヤー境界を考慮した重なり防止位置調整
 * minDistanceは次数に基づいて調整される可能性があるため、パラメータとして受け取る
 */
function adjustPositionForLayerBounds(
  position: { x: number; y: number },
  nodeId: string,
  layers: ContextLayer[],
  allPositions: Map<string, { x: number; y: number }>,
  minDistance: number
): { x: number; y: number } {
  let adjustedPos = { ...position };
  const nodeLayer = layers.find(l => l.containedNodeIds.includes(nodeId));
  
  // レイヤー境界内に収める
  if (nodeLayer && nodeLayer.bounds) {
    const bounds = nodeLayer.bounds;
    adjustedPos.x = Math.max(bounds.minX + minDistance / 2, Math.min(bounds.maxX - minDistance / 2, adjustedPos.x));
    adjustedPos.y = Math.max(bounds.minY + minDistance / 2, Math.min(bounds.maxY - minDistance / 2, adjustedPos.y));
  }
  
  // 他のレイヤーとの重なりをチェック
  layers.forEach(layer => {
    if (layer.contextNodeId === nodeLayer?.contextNodeId) return; // 同じレイヤーはスキップ
    
    const layerBounds = layer.bounds;
    if (!layerBounds) return;
    
    // レイヤー境界との重なりをチェック
    const isOverlapping = 
      adjustedPos.x + minDistance / 2 > layerBounds.minX &&
      adjustedPos.x - minDistance / 2 < layerBounds.maxX &&
      adjustedPos.y + minDistance / 2 > layerBounds.minY &&
      adjustedPos.y - minDistance / 2 < layerBounds.maxY;
    
    if (isOverlapping) {
      // 最も近い方向に移動
      const centerX = (layerBounds.minX + layerBounds.maxX) / 2;
      const centerY = (layerBounds.minY + layerBounds.maxY) / 2;
      const dx = adjustedPos.x - centerX;
      const dy = adjustedPos.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const pushDistance = minDistance * 1.5;
        adjustedPos.x = centerX + (dx / distance) * (Math.abs(dx) > Math.abs(dy) ? 
          (Math.abs(dx) + pushDistance) : 
          (Math.abs(dx) + pushDistance * Math.abs(dx) / Math.abs(dy)));
        adjustedPos.y = centerY + (dy / distance) * (Math.abs(dy) > Math.abs(dx) ? 
          (Math.abs(dy) + pushDistance) : 
          (Math.abs(dy) + pushDistance * Math.abs(dy) / Math.abs(dx)));
      }
    }
  });
  
  return adjustedPos;
}

export function useForceDirectedLayout() {
  const calculateLayout = useCallback((
    nodes: Node[],
    edges: Edge[],
    layers: ContextLayer[],
    options: LayoutOptions
  ): Node[] => {
    const { width, height, iterations = DEFAULT_ITERATIONS, temperature = width / 8, damping = DEFAULT_DAMPING } = options;
    
    if (nodes.length === 0) return nodes;

    const positions = new Map<string, { x: number; y: number }>();
    const maxDepth = Math.max(...nodes.map(n => (n.data as any).depth || 0));
    const layerHeight = maxDepth > 0 ? height / (maxDepth + 1) : height;
    const layerPadding = 50;

    // Contextノードを各レイヤーの最上部に配置
    const contextNodes = nodes.filter(n => (n.data as any).isContext);
    const nonContextNodes = nodes.filter(n => !(n.data as any).isContext);

    // 保存された位置を読み込む（重なりチェック付き）
    const savedPositions = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      const nodeData = node.data as GraphNodeData;
      const savedPosition = nodeData.properties?.position || nodeData.properties?._position;
      if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number') {
        savedPositions.set(node.id, { x: savedPosition.x, y: savedPosition.y });
      }
    });

    // 保存位置の重なりをチェックし、重なっていないもののみ使用
    savedPositions.forEach((savedPos, nodeId) => {
      let hasOverlap = false;
      savedPositions.forEach((otherPos, otherId) => {
        if (nodeId === otherId) return;
        const dx = otherPos.x - savedPos.x;
        const dy = otherPos.y - savedPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < MIN_NODE_DISTANCE) {
          hasOverlap = true;
        }
      });
      
      // 重なっていない場合のみ保存位置を使用
      if (!hasOverlap) {
        positions.set(nodeId, savedPos);
      }
    });

    // Contextノードの配置（保存位置がない場合のみ、重なりチェック付き）
    // より良い間隔で配置（円形配置の考慮）
    const contextCount = contextNodes.length;
    const contextRadius = Math.min(width * 0.3, height * 0.2); // 円の半径
    const contextCenterX = width / 2;
    const contextCenterY = layerPadding + 80; // 少し下に配置
    
    contextNodes.forEach((node, index) => {
      if (!positions.has(node.id)) {
        let initialPos: { x: number; y: number };
        
        if (contextCount === 1) {
          // 1つの場合は中央に配置
          initialPos = { x: contextCenterX, y: contextCenterY };
        } else if (contextCount <= 3) {
          // 3つ以下の場合は横並び
          const spacing = Math.min(width / (contextCount + 1), 300);
          initialPos = {
            x: spacing * (index + 1),
            y: contextCenterY,
          };
        } else {
          // 4つ以上の場合は円形配置
          const angle = (2 * Math.PI * index) / contextCount - Math.PI / 2; // 上から開始
          initialPos = {
            x: contextCenterX + Math.cos(angle) * contextRadius,
            y: contextCenterY + Math.sin(angle) * contextRadius * 0.6, // 縦方向は少し圧縮
          };
        }
        
        // 重なりのない位置を確保
        let finalPos = initialPos;
        let attempts = 0;
        while (attempts < 10) {
          let hasOverlap = false;
          positions.forEach((otherPos) => {
            const dx = otherPos.x - finalPos.x;
            const dy = otherPos.y - finalPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < MIN_NODE_DISTANCE) {
              hasOverlap = true;
              // 重なっている場合、距離を保つ方向に移動
              const angle = Math.atan2(dy, dx);
              finalPos = {
                x: otherPos.x - Math.cos(angle) * MIN_NODE_DISTANCE,
                y: otherPos.y - Math.sin(angle) * MIN_NODE_DISTANCE,
              };
            }
          });
          if (!hasOverlap) break;
          attempts++;
        }
        
        positions.set(node.id, finalPos);
      } else {
        // 保存位置がある場合も重なりチェック
        const savedPos = positions.get(node.id)!;
        let hasOverlap = false;
        positions.forEach((otherPos, otherId) => {
          if (node.id === otherId) return;
          const dx = otherPos.x - savedPos.x;
          const dy = otherPos.y - savedPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MIN_NODE_DISTANCE) {
            hasOverlap = true;
          }
        });
        
        if (hasOverlap) {
          // 重なっている場合は、円形配置を使用
          let fallbackPos: { x: number; y: number };
          if (contextCount === 1) {
            fallbackPos = { x: contextCenterX, y: contextCenterY };
          } else if (contextCount <= 3) {
            const spacing = Math.min(width / (contextCount + 1), 300);
            fallbackPos = {
              x: spacing * (index + 1),
              y: contextCenterY,
            };
          } else {
            const angle = (2 * Math.PI * index) / contextCount - Math.PI / 2;
            fallbackPos = {
              x: contextCenterX + Math.cos(angle) * contextRadius,
              y: contextCenterY + Math.sin(angle) * contextRadius * 0.6,
            };
          }
          positions.set(node.id, fallbackPos);
        }
      }
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
      
      // レイヤー内ノードの配置半径を計算（ノード数に基づいて調整）
      const layerNodeCount = layerNodes.length;
      const layerRadius = Math.min(
        Math.sqrt(layerNodeCount) * MIN_NODE_DISTANCE * 1.5,
        Math.min(width, height) * 0.25
      );
      
      // グリッドベースの配置（保存位置がない場合のみ）
      layerNodes.forEach((node, index) => {
        if (!positions.has(node.id)) {
          // ノード数が少ない場合は円形配置、多い場合はグリッド配置
          let initialPos: { x: number; y: number };
          
          if (layerNodeCount <= 8) {
            // 8個以下の場合は円形配置
            const angle = (2 * Math.PI * index) / layerNodeCount;
            const radius = Math.max(layerRadius, MIN_NODE_DISTANCE * 1.5);
            initialPos = {
              x: contextX + Math.cos(angle) * radius,
              y: contextY + 100 + Math.sin(angle) * radius * 0.8, // 縦方向は少し圧縮
            };
          } else {
            // 9個以上の場合はグリッド配置
            const gridPos = generateGridPosition(
              index,
              layerNodeCount,
              layerRadius * 2,
              layerRadius * 2,
              contextY + 100,
              MIN_NODE_DISTANCE
            );
            initialPos = {
              x: contextX - layerRadius + gridPos.x,
              y: gridPos.y,
            };
          }
          
          // レイヤー境界を考慮した位置調整
          const adjustedPos = adjustPositionForLayerBounds(
            initialPos,
            node.id,
            layers,
            positions,
            MIN_NODE_DISTANCE
          );
          
          positions.set(node.id, adjustedPos);
        } else {
          // 保存位置がある場合も、重なりチェックとレイヤー境界を考慮して調整
          const savedPos = positions.get(node.id)!;
          
          // 他のノードとの重なりをチェック
          let hasOverlap = false;
          positions.forEach((otherPos, otherId) => {
            if (node.id === otherId) return;
            const dx = otherPos.x - savedPos.x;
            const dy = otherPos.y - savedPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < MIN_NODE_DISTANCE) {
              hasOverlap = true;
            }
          });
          
          if (hasOverlap) {
            // 重なっている場合は、円形またはグリッド配置を使用
            let fallbackPos: { x: number; y: number };
            
            if (layerNodeCount <= 8) {
              const angle = (2 * Math.PI * index) / layerNodeCount;
              const radius = Math.max(layerRadius, MIN_NODE_DISTANCE * 1.5);
              fallbackPos = {
                x: contextX + Math.cos(angle) * radius,
                y: contextY + 100 + Math.sin(angle) * radius * 0.8,
              };
            } else {
              const gridPos = generateGridPosition(
                index,
                layerNodeCount,
                layerRadius * 2,
                layerRadius * 2,
                contextY + 100,
                MIN_NODE_DISTANCE
              );
              fallbackPos = {
                x: contextX - layerRadius + gridPos.x,
                y: gridPos.y,
              };
            }
            const adjustedPos = adjustPositionForLayerBounds(
              fallbackPos,
              node.id,
              layers,
              positions,
              MIN_NODE_DISTANCE
            );
            positions.set(node.id, adjustedPos);
          } else {
            // 重なっていない場合は、レイヤー境界を考慮して調整
            const adjustedPos = adjustPositionForLayerBounds(
              savedPos,
              node.id,
              layers,
              positions,
              MIN_NODE_DISTANCE
            );
            positions.set(node.id, adjustedPos);
          }
        }
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
        
        // 重なりのない位置を確保
        let finalPos = gridPos;
        let attempts = 0;
        while (attempts < 10) {
          let hasOverlap = false;
          positions.forEach((otherPos) => {
            const dx = otherPos.x - finalPos.x;
            const dy = otherPos.y - finalPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < MIN_NODE_DISTANCE) {
              hasOverlap = true;
              // 重なっている場合、距離を保つ方向に移動
              const angle = Math.atan2(dy, dx);
              finalPos = {
                x: otherPos.x - Math.cos(angle) * MIN_NODE_DISTANCE,
                y: otherPos.y - Math.sin(angle) * MIN_NODE_DISTANCE,
              };
            }
          });
          if (!hasOverlap) break;
          attempts++;
        }
        
        positions.set(node.id, finalPos);
      } else {
        // 保存位置がある場合も重なりチェック
        const savedPos = positions.get(node.id)!;
        let hasOverlap = false;
        positions.forEach((otherPos, otherId) => {
          if (node.id === otherId) return;
          const dx = otherPos.x - savedPos.x;
          const dy = otherPos.y - savedPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < MIN_NODE_DISTANCE) {
            hasOverlap = true;
          }
        });
        
        if (hasOverlap) {
          // 重なっている場合は、グリッドベースの位置を使用
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
      }
    });

    // レイヤー境界を事前計算（初期位置に基づく）
    layers.forEach(layer => {
      const layerNodePositions = layer.containedNodeIds
        .map(nodeId => positions.get(nodeId))
        .filter((pos): pos is { x: number; y: number } => pos !== undefined);
      
      if (layerNodePositions.length > 0) {
        const minX = Math.min(...layerNodePositions.map(p => p.x)) - MIN_NODE_DISTANCE;
        const maxX = Math.max(...layerNodePositions.map(p => p.x)) + MIN_NODE_DISTANCE;
        const minY = Math.min(...layerNodePositions.map(p => p.y)) - MIN_NODE_DISTANCE;
        const maxY = Math.max(...layerNodePositions.map(p => p.y)) + MIN_NODE_DISTANCE;
        
        layer.bounds = { minX, minY, maxX, maxY };
      } else {
        // ノードがない場合はデフォルト境界を設定
        layer.bounds = { minX: 0, minY: 0, maxX: width, maxY: height };
      }
    });

    // ノードの次数（接続数）を計算
    const nodeDegrees = new Map<string, number>();
    nodes.forEach(node => {
      nodeDegrees.set(node.id, 0);
    });
    edges.forEach(edge => {
      const sourceDegree = nodeDegrees.get(edge.source) || 0;
      const targetDegree = nodeDegrees.get(edge.target) || 0;
      nodeDegrees.set(edge.source, sourceDegree + 1);
      nodeDegrees.set(edge.target, targetDegree + 1);
    });
    
    // 最大次数を取得（正規化用）
    const maxDegree = Math.max(...Array.from(nodeDegrees.values()), 1);
    
    // ノードの重みを計算（次数に基づく）
    const nodeWeights = new Map<string, number>();
    nodes.forEach(node => {
      const degree = nodeDegrees.get(node.id) || 0;
      // 次数が0の場合は1、次数が多いほど重みが大きくなる（1.0 ~ 2.5の範囲）
      const weight = 1.0 + (degree / maxDegree) * 1.5;
      nodeWeights.set(node.id, weight);
    });

    // Force-directed: 反復的に位置を更新
    // 理想的なノード間距離を計算（より広いスペースを確保）
    const k = Math.sqrt((width * height) / Math.max(nodes.length, 1)) * 1.2; // 1.2倍のスペース
    let currentTemp = temperature;
    
    // 中心点を計算（グラフの中心に配置するため）
    const graphCenterX = width / 2;
    const graphCenterY = height / 2;

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { fx: number; fy: number }>();
      
      nodes.forEach(node => {
        forces.set(node.id, { fx: 0, fy: 0 });
      });

      // 反発力（全ノード間）- 次数に基づく重み付き最小距離を考慮
      nodes.forEach((node1, i) => {
        nodes.slice(i + 1).forEach(node2 => {
          const pos1 = positions.get(node1.id)!;
          const pos2 = positions.get(node2.id)!;
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
          
          // ノードの重みに基づいて最小距離を調整
          const weight1 = nodeWeights.get(node1.id) || 1.0;
          const weight2 = nodeWeights.get(node2.id) || 1.0;
          const minDistance = MIN_NODE_DISTANCE * (weight1 + weight2) / 2;
          
          // 最小距離未満の場合は強い反発力を適用
          let force: number;
          if (distance < minDistance) {
            // 衝突している場合は強制的に分離（次数が多いほど強い反発力）
            const repulsionStrength = 10 * (weight1 + weight2) / 2;
            force = (minDistance - distance) * repulsionStrength;
          } else {
            // 通常の反発力（次数が多いほど強い反発力）
            // 距離の2乗に反比例する反発力（より自然な配置）
            const repulsionMultiplier = (weight1 * weight2);
            force = (k * k / (distance * distance)) * repulsionMultiplier;
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

      // 引力（エッジで接続されたノード間）- 次数に基づく重み付き
      edges.forEach(edge => {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // ノードの重みに基づいて理想距離を調整
        const weight1 = nodeWeights.get(edge.source) || 1.0;
        const weight2 = nodeWeights.get(edge.target) || 1.0;
        // 次数が多いノードはより多くのスペースを必要とするため、理想距離を長くする
        const idealDistance = k * (weight1 + weight2) / 2;
        
        // 現在の距離と理想距離の差に基づいて引力を計算
        // 理想距離に近づくほど弱くなる（フックの法則に基づく）
        const distanceDiff = distance - idealDistance;
        const force = distanceDiff / k;
        
        // 次数が多いノード間の接続はより強い引力（ただし、距離が近すぎる場合は反発）
        const attractionStrength = 1.0 + (weight1 + weight2) / 4;
        // 距離が理想距離より遠い場合は引力、近い場合は反発
        const adjustedForce = force * attractionStrength;

        const fx = (dx / distance) * adjustedForce;
        const fy = (dy / distance) * adjustedForce;

        const f1 = forces.get(edge.source)!;
        const f2 = forces.get(edge.target)!;
        f1.fx += fx;
        f1.fy += fy;
        f2.fx -= fx;
        f2.fy -= fy;
      });

      // Contextノードとその下層ノード間の強い引力（次数に基づく重み付き）
      layers.forEach(layer => {
        const contextPos = positions.get(layer.contextNodeId);
        if (!contextPos) return;
        
        const contextWeight = nodeWeights.get(layer.contextNodeId) || 1.0;

        layer.containedNodeIds.forEach(nodeId => {
          const nodePos = positions.get(nodeId);
          if (!nodePos) return;
          
          const nodeWeight = nodeWeights.get(nodeId) || 1.0;
          const dx = nodePos.x - contextPos.x;
          const dy = nodePos.y - contextPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // 次数に基づいて理想距離を調整
          const idealDistance = k * (contextWeight + nodeWeight) / 2;
          const force = (distance - idealDistance) / k;
          
          // Contextノードとの接続はより強い引力（次数が多いほど）
          const attractionStrength = 2.0 + (contextWeight + nodeWeight) / 4;
          const adjustedForce = force * attractionStrength;

          const fx = (dx / distance) * adjustedForce;
          const fy = (dy / distance) * adjustedForce;

          const fContext = forces.get(layer.contextNodeId)!;
          const fNode = forces.get(nodeId)!;
          fContext.fx += fx;
          fContext.fy += fy;
          fNode.fx -= fx;
          fNode.fy -= fy;
        });
      });

      // 位置を更新（次数に基づく重み付き）
      nodes.forEach(node => {
        const force = forces.get(node.id)!;
        const pos = positions.get(node.id)!;
        const weight = nodeWeights.get(node.id) || 1.0;
        
        // 次数が多いノードはより安定した動きをする（重みに基づいて温度を調整）
        const adjustedTemp = currentTemp / weight;
        
        // 力の大きさを制限（急激な動きを防ぐ）
        const forceMagnitude = Math.sqrt(force.fx * force.fx + force.fy * force.fy);
        const maxForce = width / 20; // 最大力を制限
        const forceScale = forceMagnitude > maxForce ? maxForce / forceMagnitude : 1.0;
        
        pos.x += force.fx * adjustedTemp * damping * forceScale;
        pos.y += force.fy * adjustedTemp * damping * forceScale;
        
        // 中心への弱い引力（グラフが画面外に広がりすぎないように）
        const dxFromCenter = pos.x - graphCenterX;
        const dyFromCenter = pos.y - graphCenterY;
        const distanceFromCenter = Math.sqrt(dxFromCenter * dxFromCenter + dyFromCenter * dyFromCenter);
        if (distanceFromCenter > width * 0.4) {
          // 中心から離れすぎている場合は弱い引力を適用
          const centerForce = 0.01; // 非常に弱い引力
          pos.x -= (dxFromCenter / distanceFromCenter) * centerForce * currentTemp;
          pos.y -= (dyFromCenter / distanceFromCenter) * centerForce * currentTemp;
        }

        // レイヤー境界を考慮した位置調整（次数に基づく最小距離）
        const minDistance = MIN_NODE_DISTANCE * weight;
        const adjustedPos = adjustPositionForLayerBounds(
          pos,
          node.id,
          layers,
          positions,
          minDistance
        );
        pos.x = adjustedPos.x;
        pos.y = adjustedPos.y;

        // グローバル境界制約
        pos.x = Math.max(30, Math.min(width - 30, pos.x));
        pos.y = Math.max(30, Math.min(height - 30, pos.y));
      });

      // 衝突検出と強制的な分離（レイヤー境界を考慮、次数に基づく重み付き）
      const collisions = detectCollisions(positions, MIN_NODE_DISTANCE);
      collisions.forEach(collision => {
        const pos1 = positions.get(collision.node1)!;
        const pos2 = positions.get(collision.node2)!;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
        
        // ノードの重みに基づいて最小距離を調整
        const weight1 = nodeWeights.get(collision.node1) || 1.0;
        const weight2 = nodeWeights.get(collision.node2) || 1.0;
        const minDistance = MIN_NODE_DISTANCE * (weight1 + weight2) / 2;
        
        // 最小距離まで分離（重みの比率に基づいて分離量を調整）
        const totalWeight = weight1 + weight2;
        const separation1 = (minDistance - distance) * (weight2 / totalWeight);
        const separation2 = (minDistance - distance) * (weight1 / totalWeight);
        const separationX1 = (dx / distance) * separation1;
        const separationY1 = (dy / distance) * separation1;
        const separationX2 = (dx / distance) * separation2;
        const separationY2 = (dy / distance) * separation2;
        
        pos1.x -= separationX1;
        pos1.y -= separationY1;
        pos2.x += separationX2;
        pos2.y += separationY2;
        
        // レイヤー境界を考慮した位置調整（次数に基づく最小距離）
        const minDistance1 = MIN_NODE_DISTANCE * weight1;
        const minDistance2 = MIN_NODE_DISTANCE * weight2;
        const adjustedPos1 = adjustPositionForLayerBounds(
          pos1,
          collision.node1,
          layers,
          positions,
          minDistance1
        );
        const adjustedPos2 = adjustPositionForLayerBounds(
          pos2,
          collision.node2,
          layers,
          positions,
          minDistance2
        );
        
        pos1.x = adjustedPos1.x;
        pos1.y = adjustedPos1.y;
        pos2.x = adjustedPos2.x;
        pos2.y = adjustedPos2.y;
        
        // グローバル境界制約を再適用
        pos1.x = Math.max(30, Math.min(width - 30, pos1.x));
        pos1.y = Math.max(30, Math.min(height - 30, pos1.y));
        pos2.x = Math.max(30, Math.min(width - 30, pos2.x));
        pos2.y = Math.max(30, Math.min(height - 30, pos2.y));
      });

      // 温度を下げる（より滑らかな減衰）
      // 初期は速く、後半はゆっくり減衰
      const decayRate = iter < iterations / 2 ? 0.92 : 0.98;
      currentTemp *= decayRate;
      
      // 後半の反復では、エッジの長さを均一化する処理を追加
      if (iter > iterations * 0.7) {
        edges.forEach(edge => {
          const pos1 = positions.get(edge.source);
          const pos2 = positions.get(edge.target);
          if (!pos1 || !pos2) return;
          
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const weight1 = nodeWeights.get(edge.source) || 1.0;
          const weight2 = nodeWeights.get(edge.target) || 1.0;
          const idealDistance = k * (weight1 + weight2) / 2;
          
          // 理想距離との差を小さくする微調整
          if (Math.abs(distance - idealDistance) > idealDistance * 0.2) {
            const adjustment = (idealDistance - distance) * 0.05; // 非常に弱い調整
            const fx = (dx / distance) * adjustment;
            const fy = (dy / distance) * adjustment;
            
            const f1 = forces.get(edge.source)!;
            const f2 = forces.get(edge.target)!;
            f1.fx += fx;
            f1.fy += fy;
            f2.fx -= fx;
            f2.fy -= fy;
          }
        });
      }
    }

    // レイヤー境界を再計算
    layers.forEach(layer => {
      const layerNodePositions = layer.containedNodeIds
        .map(nodeId => positions.get(nodeId))
        .filter((pos): pos is { x: number; y: number } => pos !== undefined);
      
      if (layerNodePositions.length > 0) {
        const minX = Math.min(...layerNodePositions.map(p => p.x)) - MIN_NODE_DISTANCE;
        const maxX = Math.max(...layerNodePositions.map(p => p.x)) + MIN_NODE_DISTANCE;
        const minY = Math.min(...layerNodePositions.map(p => p.y)) - MIN_NODE_DISTANCE;
        const maxY = Math.max(...layerNodePositions.map(p => p.y)) + MIN_NODE_DISTANCE;
        
        layer.bounds = { minX, minY, maxX, maxY };
      }
    });

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

