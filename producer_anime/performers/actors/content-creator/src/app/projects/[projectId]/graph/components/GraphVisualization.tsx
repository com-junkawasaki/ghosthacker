/**
 * Graph Visualization Component (Hybrid UI)
 * グラフ可視化コンポーネント（ハイブリッドUI）
 * 
 * Features:
 * - FAB (Floating Action Button) for quick actions
 * - Side Panel Editor for detailed editing
 * - Context Menu for advanced operations
 * - Drag & Drop for node integration
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { graphQuery, createGraphNode, createGraphEdge, getGraphNode } from '@/internal/grpc/services/graph_client';

interface GraphVisualizationProps {
  projectId: string;
}

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

type InteractionMode = 'normal' | 'addNode' | 'addEdge' | 'selectSource' | 'selectTarget';

export default function GraphVisualization({ projectId }: GraphVisualizationProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal');
  const [fabOpen, setFabOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  
  // Form states
  const [nodeForm, setNodeForm] = useState({
    label: '',
    properties: '{}',
    jsonld: '{}',
  });
  const [edgeForm, setEdgeForm] = useState({
    label: '',
    properties: '{}',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGraphData();
  }, [projectId]);

  const loadGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load nodes
      const nodesQuery = 'SELECT id, label, properties, jsonld FROM graph_nodes LIMIT 100';
      const nodesResult = await graphQuery(nodesQuery) as any;
      
      // Load edges
      const edgesQuery = 'SELECT id, source_id, target_id, label, properties FROM graph_edges LIMIT 200';
      const edgesResult = await graphQuery(edgesQuery) as any;
      
      const parsedNodes: GraphNode[] = [];
      const parsedEdges: GraphEdge[] = [];
      const nodeMap = new Map<string, GraphNode>();

      // Parse nodes
      if (Array.isArray(nodesResult)) {
        nodesResult.forEach((row: any) => {
          if (row.id) {
            const node: GraphNode = {
              id: row.id,
              label: row.label || '',
              properties: typeof row.properties === 'string' 
                ? JSON.parse(row.properties) 
                : row.properties || {},
              x: Math.random() * 400 + 100,
              y: Math.random() * 300 + 100,
            };
            nodeMap.set(row.id, node);
            parsedNodes.push(node);
          }
        });
      }

      // Parse edges
      if (Array.isArray(edgesResult)) {
        edgesResult.forEach((row: any) => {
          if (row.id && row.source_id && row.target_id) {
            parsedEdges.push({
              id: row.id,
              source: row.source_id,
              target: row.target_id,
              label: row.label || '',
            });
          }
        });
      }
      
      setNodes(parsedNodes);
      setEdges(parsedEdges);
      setLoading(false);
    } catch (err) {
      console.error('Graph data load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
      setLoading(false);
    }
  };

  const handleCreateNode = async () => {
    try {
      const properties = JSON.parse(nodeForm.properties || '{}');
      const jsonld = JSON.parse(nodeForm.jsonld || '{}');
      
      const nodeId = await createGraphNode(
        nodeForm.label || 'New Node',
        properties,
        jsonld
      );
      
      await loadGraphData();
      setFabOpen(false);
      setNodeForm({ label: '', properties: '{}', jsonld: '{}' });
      setSelectedNode(nodeId);
      setSidePanelOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node');
    }
  };

  const handleCreateEdge = async (sourceId: string, targetId: string, label?: string) => {
    try {
      const properties = JSON.parse(edgeForm.properties || '{}');
      const edgeLabel = label || edgeForm.label || 'relatedTo';
      
      if (!edgeLabel) {
        // If no label, show modal to get label
        setEdgeSource(sourceId);
        setInteractionMode('selectTarget');
        return;
      }
      
      await createGraphEdge(
        sourceId,
        targetId,
        edgeLabel,
        properties
      );
      
      await loadGraphData();
      setEdgeForm({ label: '', properties: '{}' });
      setEdgeSource(null);
      setInteractionMode('normal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create edge');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    if (interactionMode === 'addNode') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Create node at click position
        setNodeForm({ label: '', properties: '{}', jsonld: '{}' });
        setSidePanelOpen(true);
        setInteractionMode('normal');
      }
    } else if (interactionMode === 'selectSource') {
      // Find clicked node
      const clickedNode = findNodeAtPosition(e.clientX, e.clientY);
      if (clickedNode) {
        setEdgeSource(clickedNode.id);
        setInteractionMode('selectTarget');
      }
    } else if (interactionMode === 'selectTarget') {
      const clickedNode = findNodeAtPosition(e.clientX, e.clientY);
      if (clickedNode && edgeSource && clickedNode.id !== edgeSource) {
        // If edge form has label, create immediately, otherwise show modal
        if (edgeForm.label) {
          handleCreateEdge(edgeSource, clickedNode.id);
        } else {
          // Keep in selectTarget mode, modal will be shown
        }
      } else {
        setInteractionMode('normal');
        setEdgeSource(null);
      }
    } else {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (interactionMode === 'selectSource') {
      setEdgeSource(nodeId);
      setInteractionMode('selectTarget');
      setEdgeForm({ label: '', properties: '{}' });
    } else if (interactionMode === 'selectTarget' && edgeSource && nodeId !== edgeSource) {
      if (edgeForm.label) {
        handleCreateEdge(edgeSource, nodeId);
      } else {
        // Show modal to get label first
        setSelectedNode(nodeId);
      }
    } else {
      setSelectedNode(nodeId);
      setSelectedEdge(null);
      setSidePanelOpen(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId?: string, edgeId?: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      edgeId,
    });
  };

  const handleDragStart = (nodeId: string) => {
    setDraggedNode(nodeId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetNodeId?: string) => {
    e.preventDefault();
    if (draggedNode && targetNodeId && draggedNode !== targetNodeId) {
      // Create edge between dragged node and target
      setEdgeSource(draggedNode);
      handleCreateEdge(draggedNode, targetNodeId);
    }
    setDraggedNode(null);
  };

  const findNodeAtPosition = (x: number, y: number): GraphNode | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const canvasX = x - rect.left;
    const canvasY = y - rect.top;

    return nodes.find(node => {
      const nodeX = node.x || 0;
      const nodeY = node.y || 0;
      const distance = Math.sqrt(
        Math.pow(canvasX - nodeX, 2) + Math.pow(canvasY - nodeY, 2)
      );
      return distance < 30; // Node radius
    }) || null;
  };

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const x1 = sourceNode.x || 0;
        const y1 = sourceNode.y || 0;
        const x2 = targetNode.x || 0;
        const y2 = targetNode.y || 0;

        ctx.strokeStyle = edge.id === selectedEdge ? '#3b82f6' : '#6b7280';
        ctx.lineWidth = edge.id === selectedEdge ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw edge label
        if (edge.label) {
          ctx.fillStyle = '#374151';
          ctx.font = '12px sans-serif';
          ctx.fillText(
            edge.label,
            (x1 + x2) / 2,
            (y1 + y2) / 2 - 5
          );
        }
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const x = node.x || 0;
      const y = node.y || 0;
      const isSelected = node.id === selectedNode;
      const isSource = node.id === edgeSource;

      ctx.fillStyle = isSelected ? '#3b82f6' : isSource ? '#10b981' : '#6366f1';
      ctx.strokeStyle = isSelected ? '#1e40af' : '#4f46e5';
      ctx.lineWidth = isSelected ? 3 : 2;

      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw node label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        node.label.substring(0, 8),
        x,
        y + 5
      );
    });

    // Draw mode indicator
    if (interactionMode !== 'normal') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      const modeText = 
        interactionMode === 'addNode' ? 'Click to add node' :
        interactionMode === 'selectSource' ? 'Select source node' :
        interactionMode === 'selectTarget' ? 'Select target node' :
        '';
      ctx.fillText(modeText, 20, 35);
    }
  }, [nodes, edges, selectedNode, selectedEdge, edgeSource, interactionMode]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  if (loading && !error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading graph...</div>
      </div>
    );
  }

  if (!loading && !error && nodes.length === 0 && edges.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Graph Visualization
          </h2>
          <button
            onClick={loadGraphData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">No graph data found.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Click the + button to add your first node.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Graph Visualization
          </h2>
          <button
            onClick={loadGraphData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="w-full relative">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Graph Visualization
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setInteractionMode(interactionMode === 'addNode' ? 'normal' : 'addNode')}
            className={`px-4 py-2 rounded-lg ${
              interactionMode === 'addNode'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {interactionMode === 'addNode' ? 'Cancel' : 'Add Node'}
          </button>
          <button
            onClick={() => {
              if (interactionMode === 'addEdge' || interactionMode === 'selectSource') {
                setInteractionMode('normal');
                setEdgeSource(null);
              } else {
                setInteractionMode('selectSource');
              }
            }}
            className={`px-4 py-2 rounded-lg ${
              interactionMode === 'addEdge' || interactionMode === 'selectSource' || interactionMode === 'selectTarget'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {interactionMode === 'addEdge' || interactionMode === 'selectSource' || interactionMode === 'selectTarget' ? 'Cancel Edge' : 'Add Edge'}
          </button>
          <button
            onClick={loadGraphData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
          onClick={handleCanvasClick}
          onContextMenu={(e) => handleContextMenu(e)}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-[600px] cursor-crosshair"
            onContextMenu={(e) => handleContextMenu(e)}
          />
          
          {/* Node overlays for interaction */}
          {nodes.map(node => (
            <div
              key={node.id}
              draggable
              onDragStart={() => handleDragStart(node.id)}
              onDrop={(e) => handleDrop(e, node.id)}
              onDragOver={handleDragOver}
              onClick={(e) => handleNodeClick(node.id, e)}
              onContextMenu={(e) => handleContextMenu(e, node.id)}
              className="absolute cursor-pointer"
              style={{
                left: (node.x || 0) - 20,
                top: (node.y || 0) - 20,
                width: 40,
                height: 40,
              }}
            />
          ))}

          {/* FAB (Floating Action Button) */}
          <div className="absolute bottom-4 right-4">
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl transition-transform"
              style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
            >
              +
            </button>
            
            {fabOpen && (
              <div className="absolute bottom-16 right-0 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setFabOpen(false);
                    setInteractionMode('addNode');
                    setSidePanelOpen(true);
                  }}
                  className="w-12 h-12 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 flex items-center justify-center"
                  title="Add Node"
                >
                  <span className="text-xl">○</span>
                </button>
                <button
                  onClick={() => {
                    setFabOpen(false);
                    setInteractionMode('selectSource');
                  }}
                  className="w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 flex items-center justify-center"
                  title="Add Edge"
                >
                  <span className="text-xl">→</span>
                </button>
                <button
                  onClick={() => {
                    setFabOpen(false);
                    // Import JSON-LD functionality
                  }}
                  className="w-12 h-12 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 flex items-center justify-center"
                  title="Import JSON-LD"
                >
                  <span className="text-xl">📋</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel Editor */}
        {sidePanelOpen && (
          <div className="w-80 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedNode ? 'Edit Node' : 'Create Node'}
              </h3>
              <button
                onClick={() => {
                  setSidePanelOpen(false);
                  setSelectedNode(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {selectedNode ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={selectedNodeData?.label || ''}
                    className="w-full px-3 py-2 border rounded-lg"
                    readOnly
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Properties</label>
                  <textarea
                    value={JSON.stringify(selectedNodeData?.properties || {}, null, 2)}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    rows={6}
                    readOnly
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Label *</label>
                  <input
                    type="text"
                    value={nodeForm.label}
                    onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Node label"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Properties (JSON)</label>
                  <textarea
                    value={nodeForm.properties}
                    onChange={(e) => setNodeForm({ ...nodeForm, properties: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    rows={4}
                    placeholder='{"key": "value"}'
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">JSON-LD (JSON)</label>
                  <textarea
                    value={nodeForm.jsonld}
                    onChange={(e) => setNodeForm({ ...nodeForm, jsonld: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                    rows={4}
                    placeholder='{"@type": "Person"}'
                  />
                </div>
                <button
                  onClick={handleCreateNode}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Node
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.nodeId ? (
            <>
              <button
                onClick={() => {
                  setSelectedNode(contextMenu.nodeId!);
                  setSidePanelOpen(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit Node
              </button>
              <button
                onClick={() => {
                  setEdgeSource(contextMenu.nodeId!);
                  setInteractionMode('selectTarget');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Connect to Node
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setInteractionMode('addNode');
                  setSidePanelOpen(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Add Node
              </button>
              <button
                onClick={() => {
                  setInteractionMode('selectSource');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Add Edge
              </button>
            </>
          )}
        </div>
      )}

      {/* Edge Form Modal */}
      {interactionMode === 'selectTarget' && edgeSource && !edgeForm.label && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setInteractionMode('normal');
          setEdgeSource(null);
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Edge</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Source: {nodes.find(n => n.id === edgeSource)?.label || edgeSource}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click on a target node to create the edge, or enter label below and click a node.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Label *</label>
              <input
                type="text"
                value={edgeForm.label}
                onChange={(e) => setEdgeForm({ ...edgeForm, label: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Edge label (e.g., relatedTo, knows)"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Properties (JSON)</label>
              <textarea
                value={edgeForm.properties}
                onChange={(e) => setEdgeForm({ ...edgeForm, properties: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                rows={3}
                placeholder='{"key": "value"}'
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInteractionMode('normal');
                  setEdgeSource(null);
                  setEdgeForm({ label: '', properties: '{}' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Nodes: {nodes.length} | Edges: {edges.length}
        {interactionMode !== 'normal' && (
          <span className="ml-4 text-blue-600">
            Mode: {interactionMode}
          </span>
        )}
      </div>
    </div>
  );
}
