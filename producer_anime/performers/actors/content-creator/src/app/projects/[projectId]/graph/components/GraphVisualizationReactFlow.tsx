/**
 * Graph Visualization Component with React Flow
 * React Flowを使用したグラフ可視化コンポーネント
 * 
 * Features:
 * - React Flowによるインタラクティブなグラフ可視化
 * - Contextノードと階層構造の可視化
 * - Force-directed + Layer layout
 * - Drag & Drop階層編集
 * - FAB, Side Panel, Context Menu
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { graphQuery, createGraphNode, createGraphEdge, deleteGraphEdge, getGraphNode } from '@/internal/grpc/services/graph_client';
import ContextNode from './ContextNode';
import ContextEdge from './ContextEdge';
import ContextLayerBackground from './ContextLayerBackground';
import { useForceDirectedLayout } from './useForceDirectedLayout';

interface GraphVisualizationProps {
  projectId: string;
}

interface GraphNodeData {
  label: string;
  properties: Record<string, any>;
  isContext?: boolean;
  contextData?: {
    version?: number;
    prefixes?: Record<string, string>;
  };
  contextId?: string;
  depth?: number;
  parent?: string;
  children?: string[];
}

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

type InteractionMode = 'normal' | 'addNode' | 'addEdge' | 'selectSource' | 'selectTarget';

// カスタムノードタイプ
const nodeTypes: NodeTypes = {
  context: ContextNode,
  default: ContextNode,
};

// カスタムエッジタイプ
const edgeTypes: EdgeTypes = {
  context: ContextEdge,
};

function GraphVisualizationInner({ projectId }: GraphVisualizationProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextLayers, setContextLayers] = useState<ContextLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal');
  const [fabOpen, setFabOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
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

  const { fitView, getNodes, getEdges, getViewport } = useReactFlow();
  const { calculateLayout: calculateForceLayout } = useForceDirectedLayout();
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    };
    
    checkDarkMode();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    
    return () => mediaQuery.removeEventListener('change', checkDarkMode);
  }, []);

  // Context検出関数
  const analyzeContextNodes = useCallback((nodes: Node<GraphNodeData>[]): Node<GraphNodeData>[] => {
    return nodes.map(node => {
      let jsonld: any = null;
      try {
        jsonld = typeof node.data.properties.jsonld === 'string' 
          ? JSON.parse(node.data.properties.jsonld) 
          : node.data.properties.jsonld || node.data.properties;
      } catch (e) {
        // JSON parse error - skip
      }

      const hasContext = jsonld && jsonld['@context'];
      
      let contextData: { version?: number; prefixes?: Record<string, string> } | undefined;
      if (hasContext) {
        const context = jsonld['@context'];
        if (typeof context === 'object' && context !== null) {
          contextData = {
            version: context['@version'],
            prefixes: Object.keys(context).reduce((acc, key) => {
              if (!key.startsWith('@') && typeof context[key] === 'string') {
                acc[key] = context[key];
              }
              return acc;
            }, {} as Record<string, string>),
          };
        }
      }

      return {
        ...node,
        type: hasContext ? 'context' : 'default',
        data: {
          ...node.data,
          isContext: !!hasContext,
          contextData,
        },
      };
    });
  }, []);

  // 階層構築関数
  const buildHierarchy = useCallback((
    nodes: Node<GraphNodeData>[],
    edges: Edge[]
  ): { nodes: Node<GraphNodeData>[]; contextLayers: ContextLayer[] } => {
    const contextNodes = nodes.filter(n => n.data.isContext);
    const nodeMap = new Map<string, Node<GraphNodeData>>();
    nodes.forEach(n => {
      nodeMap.set(n.id, { ...n, data: { ...n.data, children: [], depth: 0 } });
    });

    // エッジから親子関係を構築
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        if (!source.data.children) source.data.children = [];
        source.data.children.push(target.id);
        if (!target.data.parent) target.data.parent = source.id;
      }
    });

    // Contextノードをルートとして階層の深さを計算
    const calculateDepth = (nodeId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      
      if (node.data.isContext) {
        node.data.depth = 0;
        return 0;
      }

      if (node.data.parent) {
        const parentDepth = calculateDepth(node.data.parent, visited);
        node.data.depth = parentDepth + 1;
        return node.data.depth || 0;
      }

      // Contextノードを探す（エッジを辿って）
      const findContextDepth = (currentId: string, depth: number, path: Set<string>): number => {
        if (path.has(currentId)) return depth;
        path.add(currentId);
        
        const currentNode = nodeMap.get(currentId);
        if (currentNode?.data.isContext) return depth;
        
        // 親を探す
        const parentEdge = edges.find(e => e.target === currentId);
        if (parentEdge) {
          return findContextDepth(parentEdge.source, depth + 1, path);
        }
        
        return depth;
      };

      const depth = findContextDepth(nodeId, 0, new Set());
      node.data.depth = depth;
      return depth;
    };

    // 各ノードの深さを計算
    nodeMap.forEach((_, nodeId) => {
      calculateDepth(nodeId);
    });

    // Context layerの構築
    const contextLayers: ContextLayer[] = contextNodes.map(contextNode => {
      const containedNodeIds = new Set<string>();
      const visited = new Set<string>();
      
      const traverse = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const node = nodeMap.get(nodeId);
        if (!node) return;
        
        if (nodeId !== contextNode.id) {
          containedNodeIds.add(nodeId);
        }
        
        // 子ノードを探索
        if (node.data.children) {
          node.data.children.forEach(childId => {
            traverse(childId);
          });
        }
      };
      
      // Contextノードから直接接続されているノードを探索
      edges.forEach(edge => {
        if (edge.source === contextNode.id) {
          traverse(edge.target);
        }
      });
      
      return {
        contextNodeId: contextNode.id,
        containedNodeIds: Array.from(containedNodeIds),
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      };
    });

    // Context IDを各ノードに設定
    nodeMap.forEach((node, nodeId) => {
      if (!node.data.isContext) {
        const contextLayer = contextLayers.find(layer => 
          layer.containedNodeIds.includes(nodeId)
        );
        if (contextLayer) {
          node.data.contextId = contextLayer.contextNodeId;
        }
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      contextLayers,
    };
  }, []);

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
      
      const parsedNodes: Node<GraphNodeData>[] = [];
      const parsedEdges: Edge[] = [];

      // Parse nodes
      if (Array.isArray(nodesResult)) {
        nodesResult.forEach((row: any, index: number) => {
          if (row.id) {
            const properties = typeof row.properties === 'string' 
              ? JSON.parse(row.properties) 
              : row.properties || {};
            
            // jsonldフィールドも追加
            if (row.jsonld) {
              try {
                properties.jsonld = typeof row.jsonld === 'string' 
                  ? JSON.parse(row.jsonld) 
                  : row.jsonld;
              } catch (e) {
                properties.jsonld = row.jsonld;
              }
            }
            
            const node: Node<GraphNodeData> = {
              id: row.id,
              type: 'default',
              position: { 
                x: Math.random() * 400 + 100, 
                y: Math.random() * 300 + 100 
              },
              data: {
                label: row.label || '',
                properties,
              },
            };
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
              type: 'default',
              animated: false,
            });
          }
        });
      }
      
      // Context検出と階層構築
      const nodesWithContext = analyzeContextNodes(parsedNodes);
      const { nodes: nodesWithHierarchy, contextLayers: builtLayers } = buildHierarchy(nodesWithContext, parsedEdges);
      
      // Context検出後にエッジタイプを設定
      const updatedEdges = parsedEdges.map(edge => {
        const sourceNode = nodesWithHierarchy.find(n => n.id === edge.source);
        const targetNode = nodesWithHierarchy.find(n => n.id === edge.target);
        return {
          ...edge,
          type: (sourceNode?.data.isContext || targetNode?.data.isContext) ? 'context' : 'default',
        };
      });
      
      setNodes(nodesWithHierarchy);
      setEdges(updatedEdges);
      setContextLayers(builtLayers);
      setLoading(false);
    } catch (err) {
      console.error('Graph data load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphData();
  }, [projectId]);

  // React Flowのイベントハンドラ
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge = {
          ...params,
          id: `edge-${params.source}-${params.target}`,
          label: edgeForm.label || 'relatedTo',
          type: 'default',
        };
        setEdges((eds) => addEdge(newEdge, eds));
        
        // データベースに保存
        createGraphEdge(
          params.source!,
          params.target!,
          edgeForm.label || 'relatedTo',
          JSON.parse(edgeForm.properties || '{}')
        ).catch(err => {
          console.error('Failed to create edge:', err);
        });
      }
    },
    [edgeForm, setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    setSelectedNode(node.id);
    setSelectedEdge(null);
    setSidePanelOpen(true);
  }, []);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null);
  }, []);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node<GraphNodeData>) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

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

  // ドラッグ&ドロップ階層編集
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    setDraggedNodeId(node.id);
  }, []);

  const onNodeDragStop = useCallback(async (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    if (!draggedNodeId || draggedNodeId === node.id) {
      setDraggedNodeId(null);
      return;
    }

    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    if (!draggedNode) {
      setDraggedNodeId(null);
      return;
    }

    // ドロップ先のノードを検出（マウス位置から）
    const reactFlowBounds = containerRef.current?.getBoundingClientRect();
    if (!reactFlowBounds) {
      setDraggedNodeId(null);
      return;
    }

    const viewport = getViewport();
    const x = (_event.clientX - reactFlowBounds.left - viewport.x) / viewport.zoom;
    const y = (_event.clientY - reactFlowBounds.top - viewport.y) / viewport.zoom;

    // 最も近いノードを検出
    let closestNode: Node<GraphNodeData> | null = null;
    let minDistance = Infinity;

    nodes.forEach(n => {
      if (n.id === draggedNodeId) return;
      
      const nodeX = n.position.x;
      const nodeY = n.position.y;
      const distance = Math.sqrt(
        Math.pow(x - nodeX, 2) + Math.pow(y - nodeY, 2)
      );
      
      // ノードの半径（約30px）以内ならドロップ可能
      if (distance < 60 && distance < minDistance) {
        minDistance = distance;
        closestNode = n;
      }
    });

    if (closestNode) {
      try {
        // Contextノードへのドロップ
        if (closestNode.data.isContext) {
          // 既存のcontext関係を削除
          const existingContextEdge = edges.find(
            e => e.target === draggedNodeId && 
                 nodes.find(n => n.id === e.source)?.data.isContext
          );
          
          if (existingContextEdge) {
            await deleteGraphEdge(existingContextEdge.id);
          }

          // 新しいcontext関係を作成
          await handleCreateEdge(closestNode.id, draggedNodeId, 'usesContext');
        } else {
          // 通常ノードへのドロップ（親子関係）
          // 既存の親子関係を削除
          const existingParentEdge = edges.find(
            e => e.target === draggedNodeId && e.source !== closestNode.id
          );
          
          if (existingParentEdge) {
            await deleteGraphEdge(existingParentEdge.id);
          }

          // 新しい親子関係を作成
          await handleCreateEdge(closestNode.id, draggedNodeId, 'hasChild');
        }

        await loadGraphData();
      } catch (err) {
        console.error('Failed to update hierarchy:', err);
        setError(err instanceof Error ? err.message : 'Failed to update hierarchy');
      }
    }

    setDraggedNodeId(null);
  }, [draggedNodeId, nodes, edges, handleCreateEdge, loadGraphData, getViewport]);

  // Force-directed + Layer layout適用（階層ビューが有効な場合）
  useEffect(() => {
    if (showHierarchy && nodes.length > 0 && containerRef.current) {
      const width = containerRef.current.offsetWidth || 800;
      const height = containerRef.current.offsetHeight || 600;
      
      const layoutedNodes = calculateForceLayout(
        nodes,
        edges,
        contextLayers,
        { width, height }
      );
      
      setNodes(layoutedNodes);
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    }
  }, [showHierarchy, nodes.length, edges.length, contextLayers.length, calculateForceLayout, fitView, setNodes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  return (
    <div ref={containerRef} className="w-full h-[600px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className={isDarkMode ? 'dark' : ''}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap />
        
        {/* Context Layer背景 */}
        {showHierarchy && (
          <ContextLayerBackground layers={contextLayers} isDarkMode={isDarkMode} />
        )}
      </ReactFlow>

      {/* Toolbar */}
      <Panel position="top-left" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 m-2">
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
          <button
            onClick={() => setShowHierarchy(!showHierarchy)}
            className={`px-4 py-2 rounded-lg ${
              showHierarchy
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {showHierarchy ? 'Hide Hierarchy' : 'Show Hierarchy'}
          </button>
        </div>
      </Panel>

      {/* FAB */}
      <Panel position="bottom-right" className="m-4">
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
          </div>
        )}
      </Panel>

      {/* Side Panel */}
      {sidePanelOpen && (
        <Panel position="top-right" className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 m-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedNodeData ? 'Edit Node' : 'Create Node'}
            </h3>
            <button
              onClick={() => {
                setSidePanelOpen(false);
                setSelectedNode(null);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateNode(); }}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label *</label>
              <input
                type="text"
                value={nodeForm.label}
                onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Properties (JSON)</label>
              <textarea
                value={nodeForm.properties}
                onChange={(e) => setNodeForm({ ...nodeForm, properties: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={4}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">JSON-LD (JSON)</label>
              <textarea
                value={nodeForm.jsonld}
                onChange={(e) => setNodeForm({ ...nodeForm, jsonld: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSidePanelOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {selectedNodeData ? 'Update Node' : 'Create Node'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50 min-w-[160px]"
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
                className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit Node
              </button>
              <button
                onClick={() => {
                  setEdgeSource(contextMenu.nodeId!);
                  setInteractionMode('selectTarget');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Add Node
              </button>
              <button
                onClick={() => {
                  setInteractionMode('selectSource');
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Add Edge
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function GraphVisualization({ projectId }: GraphVisualizationProps) {
  return (
    <ReactFlowProvider>
      <GraphVisualizationInner projectId={projectId} />
    </ReactFlowProvider>
  );
}

