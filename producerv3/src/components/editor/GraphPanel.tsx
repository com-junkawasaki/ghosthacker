/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graph-panel
 * 
 * Graph panel component using React Flow for node/edge visualization and editing
 * Supports incidence graph model: nodes, links, and incidences
 */
'use client';

import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_GRAPH_LINKS,
  GET_GRAPH_INCIDENCES_FOR_LINK,
  GET_CHARACTERS,
  GET_GHOSTS,
  GET_LOCATIONS,
  GET_ORGANIZATIONS,
  GET_TECHNOLOGIES,
} from '@/lib/graphql/queries';
import {
  CREATE_GRAPH_LINK,
  UPDATE_GRAPH_LINK,
  DELETE_GRAPH_LINK,
  CREATE_GRAPH_INCIDENCE,
  UPDATE_GRAPH_INCIDENCE,
  DELETE_GRAPH_INCIDENCE,
} from '@/lib/graphql/mutations';
import { extractGraphLinks, linkExists, type CreateGraphLinkInput, type JsonldNode } from '@/lib/graphql/extractGraph';
import { normalizeProjectId } from '@/lib/utils/uuid';
import type { CharacterNode, GhostNode, OrganizationNode } from '@/types/jsonld';

interface GraphPanelProps {
  projectId?: string;
}

// Link type selector component
function LinkTypeSelector({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const predefinedTypes = [
    'worksFor',
    'knows',
    'parent',
    'spouse',
    'sibling',
    'colleague',
    'master',
    'createdBy',
    'founder',
    'related',
  ];
  const [customType, setCustomType] = useState('');
  const [useCustom, setUseCustom] = useState(!predefinedTypes.includes(value));

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
      <h3 className="font-bold mb-3">Select Link Type</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Predefined Types</label>
          <select
            value={useCustom ? '' : value}
            onChange={(e) => {
              setUseCustom(false);
              onChange(e.target.value);
            }}
            disabled={useCustom}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">Select...</option>
            {predefinedTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="mr-2"
            />
            Custom Type
          </label>
          <input
            type="text"
            value={useCustom ? customType : ''}
            onChange={(e) => {
              setCustomType(e.target.value);
              onChange(e.target.value);
            }}
            disabled={!useCustom}
            placeholder="Enter custom link type"
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={onConfirm}
          disabled={!value}
          className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-gray-300"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Inline editable node component
function JsonldNode({
  data,
  selected,
}: {
  data: { label: string; nodeType: string; nodeId: string; onUpdate?: (newLabel: string) => void };
  selected: boolean;
}) {
  const onUpdate = data.onUpdate;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(data.label);
  };

  const handleBlur = () => {
    if (editValue !== data.label && onUpdate) {
      onUpdate(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editValue !== data.label && onUpdate) {
        onUpdate(editValue);
      }
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`px-4 py-2 bg-white border-2 rounded-lg shadow-md ${
        selected ? 'border-blue-600' : 'border-blue-500'
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <div className="text-xs text-gray-500">{data.nodeType}</div>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
        />
      ) : (
        <div className="font-semibold">{data.label}</div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  jsonld: JsonldNode,
};

export function GraphPanel({ projectId }: GraphPanelProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [linkType, setLinkType] = useState('related');
  const [extractionDone, setExtractionDone] = useState(false);
  
  // Refs to store mutation functions to avoid unnecessary re-renders
  const createLinkRef = useRef<((options?: { variables?: unknown; onCompleted?: (data: unknown) => void; onError?: (error: Error) => void }) => Promise<unknown>) | null>(null);
  const createIncidenceRef = useRef<((options?: { variables?: unknown; onCompleted?: (data: unknown) => void; onError?: (error: Error) => void }) => Promise<unknown>) | null>(null);

  // Fetch graph data
  const { data: linksData, loading: linksLoading, refetch: refetchLinks } = useQuery(GET_GRAPH_LINKS);
  const { data: incidencesData, refetch: refetchIncidences } = useQuery(GET_GRAPH_INCIDENCES_FOR_LINK, {
    variables: { linkId: selectedEdge?.id || '' },
    skip: !selectedEdge?.id,
  });
  const { data: charactersData } = useQuery(GET_CHARACTERS);
  const { data: ghostsData } = useQuery(GET_GHOSTS);
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: organizationsData } = useQuery(GET_ORGANIZATIONS);
  const { data: technologiesData } = useQuery(GET_TECHNOLOGIES);

  // Mutations
  const [createLink] = useMutation(CREATE_GRAPH_LINK, {
    onCompleted: () => {
      refetchLinks();
      setPendingConnection(null);
    },
    onError: (error) => {
      // Ignore duplicate key constraint errors (unique_link)
      // These can occur due to race conditions or concurrent requests
      if (error.message.includes('unique_link') || error.message.includes('duplicate key')) {
        console.warn('Link already exists, skipping creation:', error.message);
        // Still refetch to ensure UI is up to date
        refetchLinks();
        return;
      }
      // Log other errors for debugging
      console.error('Error creating graph link:', error);
    },
  });
  
  // Store mutation functions in refs to avoid unnecessary re-renders
  createLinkRef.current = createLink as (options?: { variables?: unknown; onCompleted?: (data: unknown) => void; onError?: (error: Error) => void }) => Promise<unknown>;
  const [updateLink] = useMutation(UPDATE_GRAPH_LINK, {
    onCompleted: () => refetchLinks(),
  });
  const [deleteLink] = useMutation(DELETE_GRAPH_LINK, {
    onCompleted: () => {
      refetchLinks();
      setSelectedEdge(null);
    },
  });
  const [createIncidence] = useMutation(CREATE_GRAPH_INCIDENCE, {
    onCompleted: () => refetchIncidences(),
  });
  
  // Store mutation functions in refs to avoid unnecessary re-renders
  createIncidenceRef.current = createIncidence as (options?: { variables?: unknown; onCompleted?: (data: unknown) => void; onError?: (error: Error) => void }) => Promise<unknown>;
  const [updateIncidence] = useMutation(UPDATE_GRAPH_INCIDENCE, {
    onCompleted: () => refetchIncidences(),
  });
  const [deleteIncidence] = useMutation(DELETE_GRAPH_INCIDENCE, {
    onCompleted: () => refetchIncidences(),
  });

  // Auto-extract graph links from JSON-LD nodes when data is loaded
  useEffect(() => {
    if (
      !extractionDone &&
      (charactersData?.characters || ghostsData?.ghosts || organizationsData?.organizations) &&
      linksData?.graphLinks
    ) {
      const nodes: Array<{ nodeType: string; nodeId: string; data: JsonldNode }> = [];

      // Collect all JSON-LD nodes
      if (charactersData?.characters) {
        charactersData.characters.forEach((char: { id: string; name: string; [key: string]: unknown }) => {
          nodes.push({
            nodeType: 'character',
            nodeId: char.id,
            data: char as unknown as CharacterNode,
          });
        });
      }
      if (ghostsData?.ghosts) {
        ghostsData.ghosts.forEach((ghost: { id: string; name: string; [key: string]: unknown }) => {
          nodes.push({
            nodeType: 'ghost',
            nodeId: ghost.id,
            data: ghost as unknown as GhostNode,
          });
        });
      }
      if (organizationsData?.organizations) {
        organizationsData.organizations.forEach((org: { id: string; name: string; [key: string]: unknown }) => {
          nodes.push({
            nodeType: 'organization',
            nodeId: org.id,
            data: org as unknown as OrganizationNode,
          });
        });
      }

      // Extract graph links
      const { links, incidences } = extractGraphLinks(nodes);
      const existingLinks = linksData.graphLinks.map((link: {
        sourceNodeType: string;
        sourceNodeId: string;
        targetNodeType: string;
        targetNodeId: string;
        linkType: string;
      }) => ({
        sourceNodeType: link.sourceNodeType,
        sourceNodeId: link.sourceNodeId,
        targetNodeType: link.targetNodeType,
        targetNodeId: link.targetNodeId,
        linkType: link.linkType,
      }));

      // Create links that don't exist yet
      // Use refs to avoid dependency on mutation functions
      const createLinkFn = createLinkRef.current;
      const createIncidenceFn = createIncidenceRef.current;
      
      if (!createLinkFn || !createIncidenceFn) {
        return;
      }
      
      links.forEach((link) => {
        if (!linkExists(existingLinks, link)) {
          createLinkFn({
            variables: {
              input: {
                ...link,
                sourceNodeId: normalizeProjectId(link.sourceNodeId),
                targetNodeId: normalizeProjectId(link.targetNodeId),
              },
            },
            onCompleted: (data: unknown) => {
              // Create incidences for this link
              const linkData = data as { createGraphLink?: { id?: string } };
              const linkId = linkData.createGraphLink?.id;
              if (!linkId) return;
              incidences
                .filter((inc) => inc.linkIndex === links.indexOf(link))
                .forEach((inc) => {
                  createIncidenceFn({
                    variables: {
                      input: {
                        nodeType: inc.nodeType,
                        nodeId: normalizeProjectId(inc.nodeId),
                        linkId,
                        role: inc.role,
                        properties: inc.properties,
                      },
                    },
                  });
                });
            },
            onError: (error) => {
              // Ignore duplicate key constraint errors (unique_link)
              // These can occur due to race conditions or concurrent requests
              if (error.message.includes('unique_link') || error.message.includes('duplicate key')) {
                console.warn('Link already exists, skipping creation:', error.message);
                return;
              }
              // Log other errors for debugging
              console.error('Error creating graph link:', error);
            },
          });
        }
      });

      setExtractionDone(true);
    }
  }, [
    charactersData,
    ghostsData,
    organizationsData,
    linksData,
    extractionDone,
    // Note: createLink and createIncidence are excluded from dependencies
    // to prevent unnecessary re-executions. They are accessed via refs instead.
  ]);

  // Convert JSON-LD nodes to React Flow nodes
  const jsonldNodes = useMemo(() => {
    const nodes: Node[] = [];
    let yPos = 0;
    const xSpacing = 200;
    const ySpacing = 100;

    // Add characters
    if (charactersData?.characters) {
      charactersData.characters.forEach((char: { id: string; name: string }, index: number) => {
        nodes.push({
          id: `character-${char.id}`,
          type: 'jsonld',
          position: { x: 0, y: yPos + index * ySpacing },
          data: { label: char.name, nodeType: 'character', nodeId: char.id },
        });
      });
      yPos += charactersData.characters.length * ySpacing;
    }

    // Add ghosts
    if (ghostsData?.ghosts) {
      ghostsData.ghosts.forEach((ghost: { id: string; name: string }, index: number) => {
        nodes.push({
          id: `ghost-${ghost.id}`,
          type: 'jsonld',
          position: { x: xSpacing, y: yPos + index * ySpacing },
          data: { label: ghost.name, nodeType: 'ghost', nodeId: ghost.id },
        });
      });
      yPos += ghostsData.ghosts.length * ySpacing;
    }

    // Add locations
    if (locationsData?.locations) {
      locationsData.locations.forEach((loc: { id: string; name: string }, index: number) => {
        nodes.push({
          id: `location-${loc.id}`,
          type: 'jsonld',
          position: { x: xSpacing * 2, y: yPos + index * ySpacing },
          data: { label: loc.name, nodeType: 'location', nodeId: loc.id },
        });
      });
    }

    // Add organizations
    if (organizationsData?.organizations) {
      organizationsData.organizations.forEach((org: { id: string; name: string }, index: number) => {
        nodes.push({
          id: `organization-${org.id}`,
          type: 'jsonld',
          position: { x: xSpacing * 3, y: yPos + index * ySpacing },
          data: { label: org.name, nodeType: 'organization', nodeId: org.id },
        });
      });
    }

    return nodes;
  }, [charactersData, ghostsData, locationsData, organizationsData]);

  // Convert graph links to React Flow edges
  const graphEdges = useMemo(() => {
    if (!linksData?.graphLinks) return [];

    return linksData.graphLinks.map((link: {
      id: string;
      sourceNodeType: string;
      sourceNodeId: string;
      targetNodeType: string;
      targetNodeId: string;
      linkType: string;
    }) => ({
      id: link.id,
      source: `${link.sourceNodeType}-${link.sourceNodeId}`,
      target: `${link.targetNodeType}-${link.targetNodeId}`,
      label: link.linkType,
      type: 'default',
      data: { linkId: link.id },
    }));
  }, [linksData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(jsonldNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(jsonldNodes);
  }, [jsonldNodes, setNodes]);

  useEffect(() => {
    setEdges(graphEdges);
  }, [graphEdges, setEdges]);

  const handleNodeUpdate = useCallback(
    (nodeId: string, newLabel: string) => {
      // Find the node and update it via GraphQL mutation
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const [nodeType, id] = nodeId.split('-');
      // TODO: Implement node update mutation based on nodeType
      // For now, just update the local state
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: { ...n.data, label: newLabel },
              }
            : n
        )
      );
    },
    [nodes, setNodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Show link type selector dialog
      setPendingConnection(params);
      setLinkType('related');
    },
    []
  );

  const handleConfirmLink = useCallback(() => {
    if (!pendingConnection || !linkType) return;

    const sourceParts = pendingConnection.source?.split('-');
    const targetParts = pendingConnection.target?.split('-');

    if (
      sourceParts &&
      targetParts &&
      sourceParts.length === 2 &&
      targetParts.length === 2 &&
      sourceParts[1] &&
      targetParts[1]
    ) {
      if (!sourceParts[0] || !sourceParts[1] || !targetParts[0] || !targetParts[1]) {
        console.error('Invalid node IDs');
        return;
      }
      createLink({
        variables: {
          input: {
            sourceNodeType: sourceParts[0],
            sourceNodeId: normalizeProjectId(sourceParts[1]),
            targetNodeType: targetParts[0],
            targetNodeId: normalizeProjectId(targetParts[1]),
            linkType,
            properties: {},
          },
        },
      });
    }
  }, [pendingConnection, linkType, createLink]);

  const handleCancelLink = useCallback(() => {
    setPendingConnection(null);
    setLinkType('related');
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Inline editing is handled by JsonldNode component
  }, []);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const handleDeleteLink = useCallback(() => {
    if (selectedEdge) {
      deleteLink({
        variables: {
          id: selectedEdge.id,
        },
      });
    }
  }, [selectedEdge, deleteLink]);

  const handleUpdateLinkType = useCallback(
    (newLinkType: string) => {
      if (!selectedEdge) return;
      updateLink({
        variables: {
          input: {
            id: selectedEdge.id,
            linkType: newLinkType,
          },
        },
      });
    },
    [selectedEdge, updateLink]
  );

  if (linksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            selected: selectedNode?.id === node.id,
            onUpdate: (newLabel: string) => handleNodeUpdate(node.id, newLabel),
          },
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>

      {/* Link type selector dialog */}
      {pendingConnection && (
        <Panel position="top-center" className="z-50">
          <LinkTypeSelector
            value={linkType}
            onChange={setLinkType}
            onConfirm={handleConfirmLink}
            onCancel={handleCancelLink}
          />
        </Panel>
      )}

      {/* Property panel for selected node */}
      {selectedNode && (
        <Panel position="top-right" className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-2">Node Properties</h3>
          <div className="text-sm space-y-2">
            <div><strong>Type:</strong> {String(selectedNode.data.nodeType)}</div>
            <div><strong>ID:</strong> {String(selectedNode.data.nodeId)}</div>
            <div><strong>Label:</strong> {String(selectedNode.data.label)}</div>
            <div className="text-xs text-gray-500 mt-2">Double-click node to edit label</div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="mt-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm w-full"
          >
            Close
          </button>
        </Panel>
      )}

      {/* Property panel for selected edge with incidences */}
      {selectedEdge && (
        <Panel position="top-right" className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-bold mb-2">Link Properties</h3>
          <div className="text-sm space-y-2 mb-4">
            <div>
              <strong>Type:</strong>
              <select
                value={typeof selectedEdge.label === 'string' ? selectedEdge.label : 'related'}
                onChange={(e) => handleUpdateLinkType(e.target.value)}
                className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="worksFor">worksFor</option>
                <option value="knows">knows</option>
                <option value="parent">parent</option>
                <option value="spouse">spouse</option>
                <option value="sibling">sibling</option>
                <option value="colleague">colleague</option>
                <option value="master">master</option>
                <option value="createdBy">createdBy</option>
                <option value="founder">founder</option>
                <option value="related">related</option>
              </select>
            </div>
            <div><strong>Source:</strong> {selectedEdge.source}</div>
            <div><strong>Target:</strong> {selectedEdge.target}</div>
          </div>

          {/* Incidences section */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Incidences</h4>
              <button
                type="button"
                onClick={() => {
                  // Add new incidence - for now, create default source/target incidences
                  // In a full implementation, this would show a dialog to select node and role
                  if (selectedEdge?.source && selectedEdge?.target) {
                    const sourceParts = selectedEdge.source.split('-');
                    const targetParts = selectedEdge.target.split('-');
                    if (
                      sourceParts.length === 2 &&
                      targetParts.length === 2 &&
                      sourceParts[1] &&
                      targetParts[1]
                    ) {
                      // Create source incidence if it doesn't exist
                      const sourceExists = incidencesData?.graphIncidencesForLink?.some(
                        (inc: { nodeType: string; nodeId: string; role: string }) =>
                          inc.nodeType === sourceParts[0] && inc.nodeId === sourceParts[1] && inc.role === 'source'
                      );
                      if (!sourceExists && sourceParts[0] && sourceParts[1]) {
                        createIncidence({
                          variables: {
                            input: {
                              nodeType: sourceParts[0],
                              nodeId: normalizeProjectId(sourceParts[1]),
                              linkId: selectedEdge.id,
                              role: 'source',
                              properties: {},
                            },
                          },
                        });
                      }
                      // Create target incidence if it doesn't exist
                      if (targetParts[0] && targetParts[1]) {
                        const targetExists = incidencesData?.graphIncidencesForLink?.some(
                          (inc: { nodeType: string; nodeId: string; role: string }) =>
                            inc.nodeType === targetParts[0] && inc.nodeId === targetParts[1] && inc.role === 'target'
                        );
                        if (!targetExists) {
                          createIncidence({
                            variables: {
                              input: {
                                nodeType: targetParts[0],
                                nodeId: normalizeProjectId(targetParts[1]),
                                linkId: selectedEdge.id,
                                role: 'target',
                                properties: {},
                              },
                            },
                          });
                        }
                      }
                    }
                  }
                }}
                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
              >
                Add
              </button>
            </div>
            {incidencesData?.graphIncidencesForLink?.length > 0 ? (
              <div className="space-y-2">
                {incidencesData.graphIncidencesForLink.map((incidence: {
                  id: string;
                  nodeType: string;
                  nodeId: string;
                  role: string;
                  properties: Record<string, unknown> | null;
                }) => (
                  <div key={incidence.id} className="text-xs bg-gray-50 p-2 rounded">
                    <div><strong>Node:</strong> {incidence.nodeType}-{incidence.nodeId}</div>
                    <div className="mt-1">
                      <strong>Role:</strong>
                      <select
                        value={incidence.role}
                        onChange={(e) => {
                          updateIncidence({
                            variables: {
                              input: {
                                id: incidence.id,
                                role: e.target.value,
                              },
                            },
                          });
                        }}
                        className="ml-2 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="source">source</option>
                        <option value="target">target</option>
                        <option value="participant">participant</option>
                      </select>
                    </div>
                    {incidence.properties && Object.keys(incidence.properties).length > 0 && (
                      <div className="mt-1"><strong>Properties:</strong> {JSON.stringify(incidence.properties)}</div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        deleteIncidence({
                          variables: { id: incidence.id },
                        });
                      }}
                      className="mt-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No incidences</div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleDeleteLink}
              className="flex-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
            >
              Delete Link
            </button>
            <button
              type="button"
              onClick={() => setSelectedEdge(null)}
              className="flex-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              Close
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
