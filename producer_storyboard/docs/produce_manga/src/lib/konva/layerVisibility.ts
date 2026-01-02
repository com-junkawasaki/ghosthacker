/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/layer-visibility
 * 
 * Update layer visibility in Konva stage
 */

import type React from 'react';
import type Konva from 'konva';

type KonvaStageType = Konva.Stage;

/**
 * Find node by ID in Konva stage tree
 */
function findNodeById(node: any, id: string): any | null {
  if (!node) return null;
  
  // Check if this node matches
  const nodeId = node.id?.() || node.attrs?.id || node.id;
  if (nodeId === id) {
    return node;
  }
  
  // Check children
  const children = node.children || node.getChildren?.() || [];
  for (const child of children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  
  return null;
}

/**
 * Find node by name pattern in Konva stage tree
 */
function findNodeByName(node: any, namePattern: string | RegExp): any[] {
  const results: any[] = [];
  if (!node) return results;
  
  const nodeName = node.name?.() || node.attrs?.name || node.name || '';
  const matches = typeof namePattern === 'string' 
    ? nodeName.includes(namePattern)
    : namePattern.test(nodeName);
  
  if (matches) {
    results.push(node);
  }
  
  // Check children
  const children = node.children || node.getChildren?.() || [];
  for (const child of children) {
    results.push(...findNodeByName(child, namePattern));
  }
  
  return results;
}

/**
 * Update layer visibility by layer ID
 */
export function updateLayerVisibility(
  stageRef: React.RefObject<KonvaStageType> | null,
  layerId: string,
  visible: boolean
): boolean {
  if (!stageRef?.current) {
    console.warn('Stage ref is not available');
    return false;
  }
  
  const stage = stageRef.current;
  
  // Try to find node by ID first
  let node = findNodeById(stage, layerId);
  
  // If not found by ID, try to find by name pattern
  if (!node) {
    // Try panel-{id} pattern
    const panelMatch = layerId.match(/^panel-(.+)$/);
    if (panelMatch) {
      const panelId = panelMatch[1];
      const panelNodes = findNodeByName(stage, `Panel-${panelId}`);
      if (panelNodes.length > 0) {
        node = panelNodes[0];
      }
    } else {
      // Try to find by partial ID match
      const nodes = findNodeByName(stage, layerId);
      if (nodes.length > 0) {
        node = nodes[0];
      }
    }
  }
  
  if (!node) {
    console.warn(`Layer not found: ${layerId}`);
    return false;
  }
  
  // Update visibility
  try {
    if (typeof node.visible === 'function') {
      // Konva node API
      node.visible(visible);
    } else if (node.attrs) {
      // Konva JSON structure
      node.attrs.visible = visible;
    } else {
      // Direct property
      node.visible = visible;
    }
    
    // If node has a layer parent, redraw it
    const layer = node.getLayer?.() || node.parent?.getLayer?.();
    if (layer) {
      layer.draw?.();
    } else {
      // Redraw the entire stage
      stage.draw?.();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to update layer visibility:', error);
    return false;
  }
}

/**
 * Update multiple layers visibility
 */
export function updateLayersVisibility(
  stageRef: React.RefObject<KonvaStageType> | null,
  updates: Array<{ layerId: string; visible: boolean }>
): number {
  let successCount = 0;
  
  for (const update of updates) {
    if (updateLayerVisibility(stageRef, update.layerId, update.visible)) {
      successCount++;
    }
  }
  
  return successCount;
}

/**
 * Get layer visibility by layer ID
 */
export function getLayerVisibility(
  stageRef: React.RefObject<KonvaStageType> | null,
  layerId: string
): boolean | null {
  if (!stageRef?.current) {
    return null;
  }
  
  const stage = stageRef.current;
  const node = findNodeById(stage, layerId);
  
  if (!node) {
    return null;
  }
  
  if (typeof node.visible === 'function') {
    return node.visible();
  }
  
  return node.attrs?.visible ?? node.visible ?? true;
}

