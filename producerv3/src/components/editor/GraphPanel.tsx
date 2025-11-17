/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graph-panel
 * 
 * Graph panel component using React Flow for node/edge visualization and editing
 * Supports incidence graph model: nodes, links, and incidences
 */
'use client';

import { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_GRAPH_LINKS,
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

interface GraphPanelProps {
  projectId?: string;
}

// Custom node component for JSON-LD nodes
function JsonldNode({ data }: { data: { label: string; nodeType: string; nodeId: string } }) {
  return (
    <div className="px-4 py-2 bg-white border-2 border-blue-500 rounded-lg shadow-md">
      <div className="text-xs text-gray-500">{data.nodeType}</div>
      <div className="font-semibold">{data.label}</div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  jsonld: JsonldNode,
};

export function GraphPanel({ projectId }: GraphPanelProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Fetch graph data
  const { data: linksData, loading: linksLoading, refetch: refetchLinks } = useQuery(GET_GRAPH_LINKS);
  const { data: charactersData } = useQuery(GET_CHARACTERS);
  const { data: ghostsData } = useQuery(GET_GHOSTS);
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: organizationsData } = useQuery(GET_ORGANIZATIONS);
  const { data: technologiesData } = useQuery(GET_TECHNOLOGIES);

  // Mutations
  const [createLink] = useMutation(CREATE_GRAPH_LINK, {
    onCompleted: () => refetchLinks(),
  });
  const [updateLink] = useMutation(UPDATE_GRAPH_LINK, {
    onCompleted: () => refetchLinks(),
  });
  const [deleteLink] = useMutation(DELETE_GRAPH_LINK, {
    onCompleted: () => refetchLinks(),
  });

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

    return nodes;
  }, [charactersData, ghostsData, locationsData]);

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
    }));
  }, [linksData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(jsonldNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  // Update nodes and edges when data changes
  useMemo(() => {
    setNodes(jsonldNodes);
  }, [jsonldNodes, setNodes]);

  useMemo(() => {
    setEdges(graphEdges);
  }, [graphEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Create graph link when connecting nodes
      if (params.source && params.target) {
        const sourceParts = params.source.split('-');
        const targetParts = params.target.split('-');
        
        if (sourceParts.length === 2 && targetParts.length === 2) {
          createLink({
            variables: {
              input: {
                sourceNodeType: sourceParts[0],
                sourceNodeId: sourceParts[1],
                targetNodeType: targetParts[0],
                targetNodeId: targetParts[1],
                linkType: 'related',
                properties: {},
              },
            },
          });
        }
      }
    },
    [createLink]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
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
      setSelectedEdge(null);
    }
  }, [selectedEdge, deleteLink]);

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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>

      {/* Property panel for selected node/edge */}
      {selectedNode && (
        <Panel position="top-right" className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64">
          <h3 className="font-bold mb-2">Node Properties</h3>
          <div className="text-sm space-y-1">
            <div><strong>Type:</strong> {selectedNode.data.nodeType}</div>
            <div><strong>ID:</strong> {selectedNode.data.nodeId}</div>
            <div><strong>Label:</strong> {selectedNode.data.label}</div>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Close
          </button>
        </Panel>
      )}

      {selectedEdge && (
        <Panel position="top-right" className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64">
          <h3 className="font-bold mb-2">Link Properties</h3>
          <div className="text-sm space-y-1">
            <div><strong>Type:</strong> {selectedEdge.label}</div>
            <div><strong>Source:</strong> {selectedEdge.source}</div>
            <div><strong>Target:</strong> {selectedEdge.target}</div>
          </div>
          <button
            onClick={handleDeleteLink}
            className="mt-4 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
          >
            Delete Link
          </button>
          <button
            onClick={() => setSelectedEdge(null)}
            className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Close
          </button>
        </Panel>
      )}
    </div>
  );
}

