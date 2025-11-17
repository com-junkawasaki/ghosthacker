/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/extract-graph-links
 * 
 * Extract graph links and incidences from JSON-LD node relationships
 * Automatically generates GraphLink and GraphIncidence from relationship fields
 */
import { CharacterNode, GhostNode, OrganizationNode, TechnologyNode, EpisodeNode } from '@/types/jsonld';

export interface CreateGraphLinkInput {
  sourceNodeType: string;
  sourceNodeId: string;
  targetNodeType: string;
  targetNodeId: string;
  linkType: string;
  properties?: Record<string, unknown>;
}

export interface CreateGraphIncidenceInput {
  nodeType: string;
  nodeId: string;
  linkId: string;
  role: string;
  properties?: Record<string, unknown>;
}

export type JsonldNode = CharacterNode | GhostNode | OrganizationNode | TechnologyNode | EpisodeNode;

/**
 * Extract graph links and incidences from JSON-LD nodes
 */
export function extractGraphLinks(
  nodes: Array<{ nodeType: string; nodeId: string; data: JsonldNode }>
): { links: CreateGraphLinkInput[]; incidences: Array<CreateGraphIncidenceInput & { linkIndex: number }> } {
  const links: CreateGraphLinkInput[] = [];
  const incidences: Array<CreateGraphIncidenceInput & { linkIndex: number }> = [];

  // Relationship field mappings by node type
  const relationshipMappings: Record<string, Array<{ field: string; linkType: string; targetType?: string }>> = {
    character: [
      { field: 'worksFor', linkType: 'worksFor', targetType: 'organization' },
      { field: 'knows', linkType: 'knows', targetType: 'character' },
      { field: 'parent', linkType: 'parent', targetType: 'character' },
      { field: 'spouse', linkType: 'spouse', targetType: 'character' },
      { field: 'sibling', linkType: 'sibling', targetType: 'character' },
      { field: 'colleague', linkType: 'colleague', targetType: 'character' },
      { field: 'ghost', linkType: 'hasGhost', targetType: 'ghost' },
      { field: 'anchoredTo', linkType: 'anchoredTo', targetType: 'location' },
      { field: 'emits', linkType: 'emits', targetType: 'emotion' },
      { field: 'repels', linkType: 'repels', targetType: 'emotion' },
      { field: 'avoids', linkType: 'avoids', targetType: 'emotion' },
      { field: 'affiliation', linkType: 'affiliation', targetType: 'organization' },
      { field: 'memberOf', linkType: 'memberOf', targetType: 'organization' },
    ],
    ghost: [
      { field: 'master', linkType: 'master', targetType: 'character' },
      { field: 'createdBy', linkType: 'createdBy', targetType: 'character' },
    ],
    organization: [
      { field: 'founder', linkType: 'founder', targetType: 'character' },
      { field: 'items', linkType: 'hasItem', targetType: 'technology' },
      { field: 'sponsor', linkType: 'sponsor', targetType: 'organization' },
    ],
    episode: [
      { field: 'hasArc', linkType: 'hasArc', targetType: 'arc' },
      { field: 'hasScene', linkType: 'hasScene', targetType: 'scene' },
      { field: 'hasCharacter', linkType: 'hasCharacter', targetType: 'character' },
      { field: 'motifRefs', linkType: 'hasMotif', targetType: 'motif' },
      { field: 'antagonist', linkType: 'antagonist', targetType: 'character' },
      { field: 'source', linkType: 'source', targetType: 'sourceRef' },
      { field: 'flashbackOf', linkType: 'flashbackOf', targetType: 'episode' },
      { field: 'influences', linkType: 'influences', targetType: 'episode' },
      { field: 'precedes', linkType: 'precedes', targetType: 'episode' },
    ],
  };

  // Create a map of node IDs to node types for quick lookup
  const nodeIdMap = new Map<string, { nodeType: string; nodeId: string }>();
  nodes.forEach((node) => {
    nodeIdMap.set(node.nodeId, { nodeType: node.nodeType, nodeId: node.nodeId });
  });

  // Helper function to extract ID from @id field, direct ID, or GraphQL ID format
  function extractId(value: { '@id': string } | string | { id: string } | undefined): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      if ('@id' in value && value['@id']) return value['@id'];
      if ('id' in value && value.id) return value.id;
    }
    return null;
  }

  // Process each node
  nodes.forEach((node) => {
    const { nodeType, nodeId, data } = node;
    const mappings = relationshipMappings[nodeType] || [];

    mappings.forEach((mapping) => {
      const fieldValue = (data as unknown as Record<string, unknown>)[mapping.field];
      if (!fieldValue) return;

      // Handle array fields
      const targets = Array.isArray(fieldValue) ? fieldValue : [fieldValue];

      targets.forEach((target) => {
        const targetId = extractId(target as { '@id': string } | string | { id: string } | undefined);
        if (!targetId) return;
        
        // Normalize targetId - GraphQL returns UUIDs, but we need to match with nodeIdMap
        // Try to find by direct ID match first, then try to match with characterId/ghostId etc.
        let matchedNode = nodeIdMap.get(targetId);
        
        // If not found, try to find by searching through all nodes
        if (!matchedNode) {
          for (const [nodeId, nodeInfo] of nodeIdMap.entries()) {
            // Check if targetId matches any ID field in the node data
            const nodeData = nodes.find((n) => n.nodeId === nodeId)?.data as Record<string, unknown> | undefined;
            if (nodeData) {
              // Check various ID fields
              if (
                nodeData.characterId === targetId ||
                nodeData.ghostId === targetId ||
                nodeData.locationId === targetId ||
                nodeData.organizationId === targetId ||
                nodeData.technologyId === targetId ||
                nodeData.episodeId === targetId
              ) {
                matchedNode = nodeInfo;
                break;
              }
            }
          }
        }

        // Use matchedNode if found
        const targetNode = matchedNode;
        if (!targetNode) {
          // Try to infer target type from mapping
          const inferredType = mapping.targetType || 'unknown';
          // Create link with inferred type
          const linkIndex = links.length;
          links.push({
            sourceNodeType: nodeType,
            sourceNodeId: nodeId,
            targetNodeType: inferredType,
            targetNodeId: targetId,
            linkType: mapping.linkType,
            properties: {},
          });

          // Create incidences
          incidences.push({
            nodeType: nodeType,
            nodeId: nodeId,
            linkId: '', // Will be set after link creation
            role: 'source',
            properties: {},
            linkIndex,
          });
          incidences.push({
            nodeType: inferredType,
            nodeId: targetId,
            linkId: '', // Will be set after link creation
            role: 'target',
            properties: {},
            linkIndex,
          });
        } else {
          // Create link with known target type
          const linkIndex = links.length;
          links.push({
            sourceNodeType: nodeType,
            sourceNodeId: nodeId,
            targetNodeType: targetNode.nodeType,
            targetNodeId: targetNode.nodeId,
            linkType: mapping.linkType,
            properties: {},
          });

          // Create incidences
          incidences.push({
            nodeType: nodeType,
            nodeId: nodeId,
            linkId: '', // Will be set after link creation
            role: 'source',
            properties: {},
            linkIndex,
          });
          incidences.push({
            nodeType: targetNode.nodeType,
            nodeId: targetNode.nodeId,
            linkId: '', // Will be set after link creation
            role: 'target',
            properties: {},
            linkIndex,
          });
        }
      });
    });
  });

  return { links, incidences };
}

/**
 * Check if a link already exists (duplicate check)
 */
export function linkExists(
  existingLinks: Array<{ sourceNodeType: string; sourceNodeId: string; targetNodeType: string; targetNodeId: string; linkType: string }>,
  newLink: CreateGraphLinkInput
): boolean {
  return existingLinks.some(
    (link) =>
      link.sourceNodeType === newLink.sourceNodeType &&
      link.sourceNodeId === newLink.sourceNodeId &&
      link.targetNodeType === newLink.targetNodeType &&
      link.targetNodeId === newLink.targetNodeId &&
      link.linkType === newLink.linkType
  );
}

