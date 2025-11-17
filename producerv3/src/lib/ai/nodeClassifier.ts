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
  suggestedMarkType?: string;
}

/**
 * Node information for classification
 */
export interface NodeForClassification {
  text: string;
  currentType?: string;
  attributes?: Record<string, unknown>;
  markInfo?: MaskInfo[];
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
    const markInfo: MaskInfo[] = [];
    const maskAttributes = [
      'emotionMask', 'themeMask', 'contextMask', 'notesMask',
      'relationshipMask', 'virtueMask', 'anchoredToMask',
      'emitsRepelsAvoidsMask', 'phaseMask', 'roleMask',
    ];
    
    maskAttributes.forEach((attr) => {
      if (attrs[attr] === true) {
        const maskType = attr.replace('Mask', '') as MaskInfo['type'];
        markInfo.push({
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
    if (markInfo.length > 0) {
      result.markInfo = markInfo;
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
      result.markInfo = editorContext.masks;
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
    const markInfo: MaskInfo[] = [];
    const maskAttributes = [
      'emotionMask', 'themeMask', 'contextMask', 'notesMask',
      'relationshipMask', 'virtueMask', 'anchoredToMask',
      'emitsRepelsAvoidsMask', 'phaseMask', 'roleMask',
    ];

    maskAttributes.forEach((attr) => {
      if (extractedNode.attributes[attr] === true) {
        const maskType = attr.replace('Mask', '') as MaskInfo['type'];
        markInfo.push({
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
    if (markInfo.length > 0) {
      result.markInfo = markInfo;
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
    
    // Insert new node with new type and attributes
    // Filter out arrays and complex objects from attributes to prevent renderSpec errors
    // Tiptap node attributes only support primitive types (string, number, boolean, null)
    const sanitizeValue = (value: unknown): unknown => {
      // Return primitive types as-is
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }
      // Convert arrays to comma-separated strings for certain fields, or skip them
      if (Array.isArray(value)) {
        // For string arrays, join them with commas
        if (value.length > 0 && typeof value[0] === 'string') {
          return value.join(', ');
        }
        // For object arrays (like knows, hasArc, etc.), skip them
        return undefined;
      }
      // For objects with @id property, extract the ID as string
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        // If it's a simple object with @id, extract the ID
        if ('@id' in obj && typeof obj['@id'] === 'string') {
          return obj['@id'];
        }
        // For other objects, skip them (Tiptap doesn't support nested objects)
        return undefined;
      }
      return undefined;
    };

    const sanitizedAttributes: Record<string, unknown> = {};
    if (newAttributes) {
      Object.entries(newAttributes).forEach(([key, value]) => {
        const sanitized = sanitizeValue(value);
        if (sanitized !== undefined) {
          sanitizedAttributes[key] = sanitized;
        }
      });
    }
    
    // Ensure name is always a string, never an array or object
    // Handle name separately to ensure it's always a valid string
    let nodeName: string;
    if (sanitizedAttributes.name !== undefined) {
      const nameValue = sanitizedAttributes.name;
      if (typeof nameValue === 'string') {
        nodeName = nameValue;
      } else if (Array.isArray(nameValue) && nameValue.length > 0 && typeof nameValue[0] === 'string') {
        // If name is an array, take the first element
        nodeName = nameValue[0] as string;
      } else {
        nodeName = nodeContent.substring(0, 50);
      }
      // Remove name from sanitizedAttributes to avoid duplication
      delete sanitizedAttributes.name;
    } else {
      nodeName = nodeContent.substring(0, 50);
    }
    
    // Final validation: ensure all values in sanitizedAttributes are primitives
    // Double-check to filter out any arrays that might have slipped through
    const finalAttributes: Record<string, string | number | boolean | null> = {};
    Object.entries(sanitizedAttributes).forEach(([key, value]) => {
      // Skip arrays completely - they should have been converted to strings by sanitizeValue
      if (Array.isArray(value)) {
        console.warn(`Skipping array value for attribute ${key}:`, value);
        return;
      }
      // Only include primitive types
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        finalAttributes[key] = value as string | number | boolean | null;
      } else {
        console.warn(`Skipping non-primitive value for attribute ${key}:`, value, typeof value);
      }
    });
    
    // Create a safe attributes object with only primitives
    // Validate one more time that no arrays are present
    const safeAttributes: Record<string, string | number | boolean | null> = {
      name: nodeName,
    };
    
    // Add finalAttributes, ensuring no arrays slip through
    Object.entries(finalAttributes).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.error(`Array detected in finalAttributes for ${key}:`, value);
        return; // Skip arrays
      }
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        safeAttributes[key] = value;
      }
    });
    
    // Use insertContent to insert the node atomically in the same transaction
    // This avoids transaction mismatch errors by ensuring delete and insert happen in one transaction
    try {
      const { schema } = editor.state;
      const nodeType = schema.nodes[newType];
      
      if (!nodeType) {
        console.error(`Node type "${newType}" not found in schema`);
        return false;
      }
      
      // Create the node content object for insertContent
      // Tiptap's insertContent will handle text content automatically
      const nodeContentObj: { type: string; attrs: Record<string, string | number | boolean | null> } = {
        type: newType,
        attrs: safeAttributes,
      };
      
      // Execute delete and insert in the same chain to ensure atomic transaction
      // This ensures the transaction is applied atomically with consistent state
      editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(nodeContentObj).run();
      
    } catch (insertError) {
      console.error('Error inserting node:', insertError, 'Attributes:', safeAttributes);
      // Fallback: try with minimal attributes
      try {
        const { schema } = editor.state;
        const nodeType = schema.nodes[newType];
        if (nodeType) {
          const minimalNode = nodeType.create({ name: nodeName });
          editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(minimalNode).run();
        } else {
          console.error(`Node type "${newType}" not found in schema`);
          return false;
        }
      } catch (fallbackError) {
        console.error('Fallback insert also failed:', fallbackError);
        return false;
      }
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

