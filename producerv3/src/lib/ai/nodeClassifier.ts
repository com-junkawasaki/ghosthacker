/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/classify-node
 * 
 * Node Classification Utilities
 * Extract node information and classify nodes using AI
 */
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { ExtractedNode, MaskInfo } from '@/lib/editor/contextExtractor';
import { extractEditorContext, extractContextAroundCursor } from '@/lib/editor/contextExtractor';

/**
 * Node classification result
 */
export interface NodeClassificationResult {
  suggestedType: string;
  confidence: number;
  reasoning: string;
  suggestedAttributes?: Record<string, unknown>;
  suggestedMaskType?: string;
}

/**
 * Node information for classification
 */
export interface NodeForClassification {
  text: string;
  currentType?: string;
  attributes?: Record<string, unknown>;
  maskInfo?: MaskInfo[];
  context?: string;
  position?: { from: number; to: number };
}

/**
 * Extract node information for classification from editor
 */
export function extractNodeForClassification(
  editor: Editor,
  node?: ProseMirrorNode,
  position?: { from: number; to: number }
): NodeForClassification | null {
  const { state } = editor;
  
  // If node is provided, extract from that node
  if (node && position) {
    const text = node.textContent || '';
    const attrs = node.attrs as Record<string, unknown>;
    const nodeType = node.type.name;
    
    // Extract mask information
    const maskInfo: MaskInfo[] = [];
    const maskAttributes = [
      'emotionMask', 'themeMask', 'contextMask', 'notesMask',
      'relationshipMask', 'virtueMask', 'anchoredToMask',
      'emitsRepelsAvoidsMask', 'phaseMask', 'roleMask',
    ];
    
    maskAttributes.forEach((attr) => {
      if (attrs[attr] === true) {
        const maskType = attr.replace('Mask', '') as MaskInfo['type'];
        maskInfo.push({
          type: maskType,
          enabled: true,
          attributes: attrs,
        });
      }
    });
    
    // Extract context around the node
    const contextRange = 200;
    const contextFrom = Math.max(0, position.from - contextRange);
    const contextTo = Math.min(state.doc.content.size, position.to + contextRange);
    const context = state.doc.textBetween(contextFrom, contextTo);
    
    const result: NodeForClassification = {
      text,
      position,
    };
    if (nodeType) {
      result.currentType = nodeType;
    }
    if (Object.keys(attrs).length > 0) {
      result.attributes = attrs;
    }
    if (maskInfo.length > 0) {
      result.maskInfo = maskInfo;
    }
    if (context) {
      result.context = context;
    }
    return result;
  }
  
  // Otherwise, extract from selection
  const editorContext = state.selection.empty
    ? extractContextAroundCursor(editor, 200)
    : extractEditorContext(editor);
  
  if (editorContext.selectedNodes.length === 0 && !editorContext.selectedText) {
    return null;
  }
  
  // Use first selected node or selected text
  const firstNode = editorContext.selectedNodes[0];
  const text = firstNode
    ? state.doc.textBetween(firstNode.position.from, firstNode.position.to)
    : editorContext.selectedText;
  
  const result: NodeForClassification = {
    text: text || '',
  };
  if (firstNode?.type) {
    result.currentType = firstNode.type;
  }
  if (firstNode?.attributes && Object.keys(firstNode.attributes).length > 0) {
    result.attributes = firstNode.attributes;
  }
  if (editorContext.masks.length > 0) {
    result.maskInfo = editorContext.masks;
  }
  if (editorContext.selectedText) {
    result.context = editorContext.selectedText;
  }
  return result;
}

/**
 * Extract multiple nodes for classification
 */
export function extractNodesForClassification(
  editor: Editor,
  nodes: Array<{ node: ProseMirrorNode; position: { from: number; to: number } }>
): NodeForClassification[] {
  return nodes
    .map(({ node, position }) => extractNodeForClassification(editor, node, position))
    .filter((nodeInfo): nodeInfo is NodeForClassification => nodeInfo !== null);
}

/**
 * Extract multiple nodes from selection range for classification
 * Returns all nodes found in the selection range
 */
export function extractMultipleNodesFromSelection(
  editor: Editor
): NodeForClassification[] {
  const { state } = editor;
  const { selection } = state;
  const { from, to } = selection;

  // If selection is empty, return empty array
  if (selection.empty) {
    return [];
  }

  // Extract context from selection
  const editorContext = extractEditorContext(editor);

  // If no nodes found, return empty array
  if (editorContext.selectedNodes.length === 0) {
    return [];
  }

  // Convert ExtractedNode[] to NodeForClassification[]
  return editorContext.selectedNodes.map((extractedNode) => {
    const { state } = editor;
    const text = state.doc.textBetween(
      extractedNode.position.from,
      extractedNode.position.to
    );

    // Extract mask information from attributes
    const maskInfo: MaskInfo[] = [];
    const maskAttributes = [
      'emotionMask', 'themeMask', 'contextMask', 'notesMask',
      'relationshipMask', 'virtueMask', 'anchoredToMask',
      'emitsRepelsAvoidsMask', 'phaseMask', 'roleMask',
    ];

    maskAttributes.forEach((attr) => {
      if (extractedNode.attributes[attr] === true) {
        const maskType = attr.replace('Mask', '') as MaskInfo['type'];
        maskInfo.push({
          type: maskType,
          enabled: true,
          attributes: extractedNode.attributes,
        });
      }
    });

    // Extract context around the node
    const contextRange = 200;
    const contextFrom = Math.max(0, extractedNode.position.from - contextRange);
    const contextTo = Math.min(
      state.doc.content.size,
      extractedNode.position.to + contextRange
    );
    const context = state.doc.textBetween(contextFrom, contextTo);

    const result: NodeForClassification = {
      text: text || '',
      position: extractedNode.position,
    };
    if (extractedNode.type) {
      result.currentType = extractedNode.type;
    }
    if (Object.keys(extractedNode.attributes).length > 0) {
      result.attributes = extractedNode.attributes;
    }
    if (maskInfo.length > 0) {
      result.maskInfo = maskInfo;
    }
    const finalContext = context || editorContext.selectedText;
    if (finalContext) {
      result.context = finalContext;
    }
    return result;
  });
}

/**
 * Extract node ID from node attributes based on node type
 */
export function extractNodeId(nodeType: string, attributes: Record<string, unknown>): string | null {
  const idAttributeMap: Record<string, string> = {
    character: 'characterId',
    ghost: 'ghostId',
    location: 'locationId',
    organization: 'organizationId',
    company: 'companyId',
    technology: 'technologyId',
    episode: 'episodeId',
    scene: 'sceneId',
    arc: 'arcId',
    motif: 'motifId',
    season: 'seasonId',
    timeline: 'timelineId',
    pov: 'povId',
    beat: 'beatId',
    event: 'eventId',
    sourceRef: 'sourceRefId',
    occupation: 'occupationId',
    setting: 'settingId',
  };

  const idAttribute = idAttributeMap[nodeType];
  if (!idAttribute) {
    return null;
  }

  const nodeId = attributes[idAttribute];
  return typeof nodeId === 'string' ? nodeId : null;
}

/**
 * Get node ID and type from editor node
 */
export function getNodeIdAndType(
  editor: Editor,
  nodePosition: { from: number; to: number }
): { nodeId: string | null; nodeType: string | null } | null {
  const { state } = editor;
  const { from } = nodePosition;

  try {
    const node = state.doc.nodeAt(from);
    if (!node) {
      return null;
    }

    const nodeType = node.type.name;
    const attributes = node.attrs as Record<string, unknown>;
    const nodeId = extractNodeId(nodeType, attributes);

    return { nodeId, nodeType };
  } catch (error) {
    console.error('Error getting node ID and type:', error);
    return null;
  }
}

/**
 * Reclassify a node in the editor
 */
export function reclassifyNode(
  editor: Editor,
  nodePosition: { from: number; to: number },
  newType: string,
  newAttributes?: Record<string, unknown>
): boolean {
  const { state } = editor;
  const { from, to } = nodePosition;
  
  try {
    const node = state.doc.nodeAt(from);
    if (!node) {
      return false;
    }
    
    // Map new type to Tiptap command
    const typeCommandMap: Record<string, string> = {
      character: 'insertCharacter',
      location: 'insertLocation',
      scene: 'insertScene',
      technology: 'insertTechnology',
      organization: 'insertOrganization',
      ghost: 'insertGhost',
      episode: 'insertEpisode',
      arc: 'insertArc',
      motif: 'insertMotif',
      event: 'insertEvent',
    };
    
    const command = typeCommandMap[newType];
    if (!command) {
      return false;
    }
    
    // Get current node content
    const nodeContent = node.textContent || '';
    
    // Delete old node and insert new one
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .deleteSelection()
      .run();
    
    // Insert new node with new type and attributes
    // Filter out arrays from attributes to prevent renderSpec errors
    const sanitizedAttributes: Record<string, unknown> = {};
    if (newAttributes) {
      Object.entries(newAttributes).forEach(([key, value]) => {
        // Skip arrays and null/undefined values
        if (!Array.isArray(value) && value !== null && value !== undefined) {
          sanitizedAttributes[key] = value;
        }
      });
    }
    
    const insertCommand = (editor.chain().focus() as any)[command];
    if (insertCommand) {
      insertCommand({
        ...sanitizedAttributes,
        name: sanitizedAttributes.name || nodeContent.substring(0, 50),
      }).run();
    }
    
    return true;
  } catch (error) {
    console.error('Error reclassifying node:', error);
    return false;
  }
}

/**
 * Get node type display name
 */
export function getNodeTypeDisplayName(nodeType: string): string {
  const displayNames: Record<string, string> = {
    character: 'Character',
    location: 'Location',
    scene: 'Scene',
    technology: 'Technology',
    organization: 'Organization',
    ghost: 'Ghost',
    episode: 'Episode',
    arc: 'Arc',
    motif: 'Motif',
    event: 'Event',
  };
  
  return displayNames[nodeType] || nodeType;
}

/**
 * Validate node type
 */
export function isValidNodeType(nodeType: string): boolean {
  const validTypes = [
    'character',
    'location',
    'scene',
    'technology',
    'organization',
    'ghost',
    'episode',
    'arc',
    'motif',
    'event',
  ];
  
  return validTypes.includes(nodeType.toLowerCase());
}

