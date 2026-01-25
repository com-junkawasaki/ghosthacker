/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/layer-extractor
 * 
 * Extract layer information from konvaStageJson
 */

export interface PanelLayer {
  id: string;
  name: string;
  type: 'image' | 'dialogue' | 'drawing' | 'text' | 'speech_bubble' | 'shape' | 'panel';
  visible: boolean;
  zIndex: number;
}

export interface PanelLayerGroup {
  panelId: string;
  panelName: string;
  layers: PanelLayer[];
}

/**
 * Extract layer type from Konva node
 */
function extractLayerType(node: any): PanelLayer['type'] {
  const className = node.className || '';
  const name = node.name || '';
  
  // Check by className first (more reliable)
  if (className.includes('Image') || name.includes('Image') || name.includes('PanelImage')) {
    return 'image';
  }
  if (className.includes('SpeechBubble') || name.includes('SpeechBubble') || name.includes('Bubble')) {
    return 'speech_bubble';
  }
  if (className.includes('Text') || name.includes('Text')) {
    return 'text';
  }
  if (className.includes('Line') || name.includes('Drawing') || name.includes('Line')) {
    return 'drawing';
  }
  if (className.includes('Rect') || className.includes('Circle') || className.includes('Shape')) {
    if (name.includes('PanelRect')) {
      return 'panel';
    }
    return 'shape';
  }
  
  // Default based on name patterns
  if (name.includes('Dialogue') || name.includes('dialogue')) {
    return 'dialogue';
  }
  
  return 'panel';
}

/**
 * Extract layer name from Konva node
 */
function extractLayerName(node: any, type: PanelLayer['type']): string {
  const name = node.name || '';
  
  // Use specific names if available
  if (name.includes('PanelRect')) {
    return 'Panel';
  }
  if (name.includes('Image') || name.includes('PanelImage')) {
    return 'Image';
  }
  if (name.includes('SpeechBubble') || name.includes('Bubble')) {
    return 'Speech Bubble';
  }
  if (name.includes('Text')) {
    return 'Text';
  }
  if (name.includes('Line') || name.includes('Drawing')) {
    return 'Drawing';
  }
  if (name.includes('Rect') || name.includes('Circle')) {
    return 'Shape';
  }
  
  // Default names by type
  switch (type) {
    case 'image':
      return 'Image';
    case 'speech_bubble':
      return 'Speech Bubble';
    case 'text':
      return 'Text';
    case 'drawing':
      return 'Drawing';
    case 'shape':
      return 'Shape';
    case 'panel':
      return 'Panel';
    default:
      return name || 'Layer';
  }
}

/**
 * Recursively extract layers from Konva node tree
 */
function extractLayersFromNode(
  node: any,
  parentPanelId: string | null = null,
  zIndex: number = 0
): PanelLayer[] {
  const layers: PanelLayer[] = [];
  
  if (!node) return layers;
  
  const nodeId = node.id || node.attrs?.id || `${parentPanelId}-${zIndex}`;
  const visible = node.attrs?.visible !== false && node.visible !== false;
  const type = extractLayerType(node);
  const name = extractLayerName(node, type);
  
  // Skip the root PanelLayer group
  if (node.name === 'PanelLayer') {
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        layers.push(...extractLayersFromNode(child, parentPanelId, index));
      });
    }
    return layers;
  }
  
  // Check if this is a panel group (Panel-{panelId})
  const panelMatch = node.name?.match(/^Panel-(.+)$/);
  if (panelMatch) {
    const panelId = panelMatch[1];
    const panelLayer: PanelLayer = {
      id: `panel-${panelId}`,
      name: `Panel ${panelId}`,
      type: 'panel',
      visible,
      zIndex: 0,
    };
    layers.push(panelLayer);
    
    // Extract layers from panel children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        const childLayers = extractLayersFromNode(child, panelId, index + 1);
        layers.push(...childLayers);
      });
    }
    return layers;
  }
  
  // Regular layer node
  const layer: PanelLayer = {
    id: nodeId,
    name,
    type,
    visible,
    zIndex,
  };
  layers.push(layer);
  
  // Recursively process children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any, index: number) => {
      layers.push(...extractLayersFromNode(child, parentPanelId, zIndex + index + 1));
    });
  }
  
  return layers;
}

/**
 * Group layers by panel
 */
function groupLayersByPanel(layers: PanelLayer[]): PanelLayerGroup[] {
  const groups: Map<string, PanelLayerGroup> = new Map();
  
  let currentPanelId: string | null = null;
  let currentGroup: PanelLayerGroup | null = null;
  
  for (const layer of layers) {
    // If this is a panel layer, start a new group
    if (layer.type === 'panel' && layer.id.startsWith('panel-')) {
      const panelId = layer.id.replace('panel-', '');
      currentPanelId = panelId;
      currentGroup = {
        panelId,
        panelName: layer.name,
        layers: [],
      };
      groups.set(panelId, currentGroup);
    } else if (currentGroup) {
      // Add layer to current group
      currentGroup.layers.push(layer);
    }
  }
  
  // If no panels found but layers exist, create a default group
  if (groups.size === 0 && layers.length > 0) {
    return [{
      panelId: 'default',
      panelName: 'Default Panel',
      layers,
    }];
  }
  
  return Array.from(groups.values());
}

/**
 * Extract panel layer groups from konvaStageJson
 */
export function extractPanelLayers(
  konvaStageJson: Record<string, unknown> | null | undefined,
  panels?: Array<{ id: string; panelId?: string }>
): PanelLayerGroup[] {
  if (!konvaStageJson) {
    return [];
  }
  
  // Extract layers from stage JSON
  const stageChildren = (konvaStageJson.children as any[]) || [];
  const allLayers: PanelLayer[] = [];
  
  // Process each layer in the stage
  for (const layer of stageChildren) {
    const layerLayers = extractLayersFromNode(layer);
    allLayers.push(...layerLayers);
  }
  
  // Group layers by panel
  const groupedLayers = groupLayersByPanel(allLayers);
  
  // If panels data is provided, ensure all panels have groups
  if (panels && panels.length > 0) {
    const panelMap = new Map(groupedLayers.map(g => [g.panelId, g]));
    
    for (const panel of panels) {
      const panelId = panel.panelId || panel.id;
      if (!panelMap.has(panelId)) {
        panelMap.set(panelId, {
          panelId,
          panelName: `Panel ${panelId}`,
          layers: [],
        });
      }
    }
    
    return Array.from(panelMap.values());
  }
  
  return groupedLayers;
}

/**
 * Get flat list of all layers (for backward compatibility)
 */
export function extractAllLayers(
  konvaStageJson: Record<string, unknown> | null | undefined
): PanelLayer[] {
  if (!konvaStageJson) {
    return [];
  }
  
  const stageChildren = (konvaStageJson.children as any[]) || [];
  const allLayers: PanelLayer[] = [];
  
  for (const layer of stageChildren) {
    const layerLayers = extractLayersFromNode(layer);
    allLayers.push(...layerLayers);
  }
  
  return allLayers;
}

