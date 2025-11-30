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
import { graphQuery, createGraphNode, createGraphEdge, deleteGraphEdge, getGraphNode, updateGraphNode } from '@/internal/grpc/services/graph_client';
import ContextNode from './ContextNode';
import ContextEdge from './ContextEdge';
import StoryElementNode from './StoryElementNode';
import StoryElementEdge from './StoryElementEdge';
import StoryElementEditor from './StoryElementEditor';
import StoryElementFAB from './StoryElementFAB';
import StoryElementConnection from './StoryElementConnection';
import ProcessExecutionPanel from './ProcessExecutionPanel';
import ContextLayerBackground from './ContextLayerBackground';
import { useForceDirectedLayout } from './useForceDirectedLayout';
import { useStoryElementLayout } from './useStoryElementLayout';
import { GraphNodeData, StoryElementNodeType, StoryElementEdgeType, ELEMENT_TYPE_LABELS } from './types';

interface GraphVisualizationProps {
  projectId: string;
}

// GraphNodeData is now imported from types.ts

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

type InteractionMode = 'normal' | 'addNode' | 'addEdge' | 'selectSource' | 'selectTarget';

// カスタムノードタイプ
const nodeTypes: NodeTypes = {
  context: ContextNode,
  storyElement: StoryElementNode,
  default: StoryElementNode,
};

// カスタムエッジタイプ
const edgeTypes: EdgeTypes = {
  context: ContextEdge,
  storyElement: StoryElementEdge,
  default: StoryElementEdge,
};

function GraphVisualizationInner({ projectId }: GraphVisualizationProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const positionUpdateTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
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
    nodeType: 'character' as StoryElementNodeType,
  });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [processExecutionNode, setProcessExecutionNode] = useState<string | null>(null);
  const [edgeForm, setEdgeForm] = useState({
    label: '',
    properties: '{}',
  });

  const { fitView, getNodes, getEdges, getViewport } = useReactFlow();
  const { calculateLayout: calculateForceLayout } = useForceDirectedLayout();
  const { calculateLayout: calculateStoryElementLayout } = useStoryElementLayout();
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
            
            // Determine node type from properties or jsonld
            const jsonld = properties.jsonld || {};
            const isContext = jsonld['@type'] === 'gh:Context' || 
                             properties.isContext === true ||
                             jsonld['@type']?.includes('Context');
            
            let nodeType: StoryElementNodeType | undefined = properties.nodeType || jsonld.nodeType;
            if (!nodeType && !isContext) {
              // Infer node type from properties
              if (properties.name || properties.role || properties.personality) {
                nodeType = 'character';
              } else if (properties.purpose || properties.targetLength) {
                nodeType = 'beat';
              } else if (properties.setting || properties.era || properties.rules) {
                nodeType = 'worldview';
              } else if (properties.startDate || properties.endDate) {
                nodeType = 'timeline';
              } else if (properties.location || properties.participants) {
                nodeType = 'scene';
              } else if (properties.type === 'event' || properties.description) {
                nodeType = 'event';
              } else if (properties.origin || properties.motivation) {
                nodeType = 'background';
              }
            }
            
            // 保存された位置情報を復元
            const savedPosition = properties.position || properties._position;
            const position = savedPosition && typeof savedPosition === 'object' && 
                           typeof savedPosition.x === 'number' && 
                           typeof savedPosition.y === 'number'
              ? { x: savedPosition.x, y: savedPosition.y }
              : { 
                  x: Math.random() * 400 + 100, 
                  y: Math.random() * 300 + 100 
                };
            
            const node: Node<GraphNodeData> = {
              id: row.id,
              type: isContext ? 'context' : (nodeType ? 'storyElement' : 'default'),
              position,
              data: {
                label: row.label || '',
                nodeType,
                properties,
                jsonld: jsonld,
                isContext,
                contextData: isContext ? {
                  version: jsonld['@context']?.version || 1,
                  prefixes: jsonld['@context']?.prefixes || {},
                } : undefined,
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
            const edgeProperties = typeof row.properties === 'string'
              ? JSON.parse(row.properties)
              : (row.properties || {});
            
            // Determine edge type from properties or label
            let edgeType: StoryElementEdgeType = edgeProperties.edgeType || 'relatesTo';
            if (!edgeProperties.edgeType) {
              const label = (row.label || '').toLowerCase();
              if (label.includes('contains') || label === 'hasChild') {
                edgeType = 'contains';
              } else if (label.includes('belongs') || label === 'usesContext') {
                edgeType = 'belongsTo';
              } else if (label.includes('appears') || label.includes('participates')) {
                edgeType = 'appearsIn';
              } else if (label.includes('influence')) {
                edgeType = 'influences';
              } else if (label.includes('precedes') || label.includes('before')) {
                edgeType = 'precedes';
              } else if (label.includes('causes') || label.includes('leads')) {
                edgeType = 'causes';
              } else if (label.includes('conflict')) {
                edgeType = 'conflictsWith';
              }
            }
            
            parsedEdges.push({
              id: row.id,
              source: row.source_id,
              target: row.target_id,
              label: row.label || '',
              type: edgeType ? 'storyElement' : 'default',
              animated: false,
              data: {
                label: row.label || '',
                edgeType,
                properties: edgeProperties,
              },
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

  // 自動実行チェック（processノードのautoExecuteがtrueの場合）
  useEffect(() => {
    if (nodes.length === 0) return;

    const autoExecuteProcesses = nodes.filter(node => {
      const props = node.data.properties as any;
      return node.data.nodeType === 'process' &&
             props.autoExecute === true &&
             props.executionStatus !== 'running' &&
             props.executionStatus !== 'completed';
    });

    autoExecuteProcesses.forEach(async (processNode) => {
      try {
        const response = await fetch(`/api/grpc/graph/process/${processNode.id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationType: processNode.data.properties.generationType || 'document',
            options: {},
          }),
        });

        if (response.ok) {
          await loadGraphData();
        }
      } catch (err) {
        console.error('Auto-execution failed:', err);
      }
    });
  }, [nodes.length]); // 初回ロード時のみ実行

  // ノード位置変更を検出して保存
  const handleNodesChange = useCallback((changes: any[]) => {
    // React FlowのonNodesChangeを呼び出す
    onNodesChange(changes);

    // 位置変更を検出（ドラッグ終了時のみ保存）
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && change.id && !change.dragging) {
        const node = nodes.find(n => n.id === change.id);
        if (!node) return;

        // 位置が実際に変更されたか確認
        const currentPosition = node.position;
        const newPosition = change.position;
        if (currentPosition.x === newPosition.x && currentPosition.y === newPosition.y) {
          return; // 位置が変更されていない場合はスキップ
        }

        // 既存のタイムアウトをクリア
        const existingTimeout = positionUpdateTimeoutRef.current.get(change.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // デバウンス: 500ms後に保存
        const timeout = setTimeout(async () => {
          try {
            const updatedProperties = {
              ...node.data.properties,
              position: newPosition,
            };

            await updateGraphNode(
              change.id,
              node.data.label,
              updatedProperties,
              node.data.jsonld || {}
            );

            positionUpdateTimeoutRef.current.delete(change.id);
          } catch (err) {
            console.error('Failed to save node position:', err);
            positionUpdateTimeoutRef.current.delete(change.id);
          }
        }, 500);

        positionUpdateTimeoutRef.current.set(change.id, timeout);
      }
    });
  }, [nodes, onNodesChange]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      positionUpdateTimeoutRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      positionUpdateTimeoutRef.current.clear();
    };
  }, []);

  // React Flowのイベントハンドラ
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        // 接続UIを表示（StoryElementConnectionコンポーネントで処理）
        setEdgeSource(params.source);
        setInteractionMode('selectTarget');
      }
    },
    [setEdges]
  );

  const handleConnectWithType = useCallback(async (
    sourceId: string,
    targetId: string,
    edgeType: StoryElementEdgeType,
    label: string
  ) => {
    try {
      const properties = {
        edgeType,
        ...JSON.parse(edgeForm.properties || '{}'),
      };
      
      await createGraphEdge(sourceId, targetId, label, properties);
      await loadGraphData();
      setEdgeSource(null);
      setInteractionMode('normal');
      setSelectedNode(null);
    } catch (err) {
      console.error('Failed to create edge:', err);
      setError(err instanceof Error ? err.message : 'Failed to create edge');
    }
  }, [edgeForm.properties, loadGraphData]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    if (interactionMode === 'selectTarget' && edgeSource) {
      // ターゲットノード選択モード
      handleConnectWithType(edgeSource, node.id, 'relatesTo', 'relatesTo');
    } else if (node.data.nodeType === 'process') {
      // Processノードの場合は実行パネルを表示
      setProcessExecutionNode(node.id);
      setSelectedNode(node.id);
    } else {
      setSelectedNode(node.id);
      setSelectedEdge(null);
      setSidePanelOpen(true);
    }
  }, [interactionMode, edgeSource, handleConnectWithType]);

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

  const handleUpdateNode = async (id: string, data: Partial<GraphNodeData>) => {
    try {
      const node = nodes.find(n => n.id === id);
      if (!node) return;

      const updatedProperties = { ...node.data.properties, ...data.properties };
      const updatedJsonld = { ...node.data.jsonld, ...data.jsonld };

      await createGraphNode(
        data.label || node.data.label,
        updatedProperties,
        updatedJsonld
      );

      // Update local state
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                ...data,
                properties: updatedProperties,
                jsonld: updatedJsonld,
              },
            };
          }
          return n;
        })
      );

      await loadGraphData();
    } catch (err) {
      console.error('Failed to update node:', err);
      setError(err instanceof Error ? err.message : 'Failed to update node');
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

  const handleNodeTypeSelect = async (type: StoryElementNodeType) => {
    try {
      const defaultProperties: Record<string, any> = {};
      
      // タイプに応じたデフォルトプロパティを設定
      switch (type) {
        case 'character':
          defaultProperties.name = '';
          defaultProperties.role = '';
          break;
        case 'beat':
          defaultProperties.purpose = 'setup';
          defaultProperties.targetLength = 200;
          break;
        case 'worldview':
          defaultProperties.setting = '';
          defaultProperties.era = '';
          break;
        case 'timeline':
          defaultProperties.startDate = '';
          defaultProperties.endDate = '';
          break;
        case 'scene':
          defaultProperties.location = '';
          defaultProperties.participants = [];
          break;
        case 'event':
          defaultProperties.type = '';
          defaultProperties.description = '';
          break;
        case 'background':
          defaultProperties.origin = '';
          defaultProperties.motivation = '';
          break;
        case 'process':
          defaultProperties.generationType = 'document';
          defaultProperties.llmProvider = 'openai';
          defaultProperties.modelId = 'gpt-4';
          defaultProperties.promptTemplate = 'Generate content based on:\n\n{{context}}\n\nRelated nodes:\n{{relatedNodes}}';
          defaultProperties.autoExecute = false;
          defaultProperties.inputNodes = [];
          defaultProperties.outputFormat = 'markdown';
          defaultProperties.executionStatus = 'idle';
          break;
      }

      const nodeId = await createGraphNode(
        `New ${ELEMENT_TYPE_LABELS[type]}`,
        { ...defaultProperties, nodeType: type },
        { nodeType: type }
      );

      await loadGraphData();
      setSelectedNode(nodeId);
      if (type === 'process') {
        setProcessExecutionNode(nodeId);
      } else {
        setSidePanelOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node');
    }
  };

  // ドラッグ&ドロップ階層編集
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    setDraggedNodeId(node.id);
  }, []);

  const onNodeDragStop = useCallback(async (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    // ドラッグ終了時に位置を保存
    try {
      const updatedProperties = {
        ...node.data.properties,
        position: node.position,
      };

      await updateGraphNode(
        node.id,
        node.data.label,
        updatedProperties,
        node.data.jsonld || {}
      );
    } catch (err) {
      console.error('Failed to save node position after drag:', err);
    }

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
      
      // まず要素タイプ別レイアウトを適用
      const typeLayoutedNodes = calculateStoryElementLayout(
        nodes,
        edges,
        contextLayers,
        { width, height }
      );
      
      // その後、Force-directed layoutで微調整
      const layoutedNodes = calculateForceLayout(
        typeLayoutedNodes,
        edges,
        contextLayers,
        { width, height }
      );
      
      setNodes(layoutedNodes);
      
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    }
  }, [showHierarchy, nodes.length, edges.length, contextLayers.length, calculateStoryElementLayout, calculateForceLayout, fitView, setNodes]);

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
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_event, node) => {
          setEditingNodeId(node.id);
          setEditingLabel(node.data.label);
        }}
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

      {/* Story Element Connection UI */}
      {interactionMode === 'selectSource' || interactionMode === 'selectTarget' ? (
        <StoryElementConnection
          sourceId={edgeSource}
          targetId={interactionMode === 'selectTarget' && selectedNode ? selectedNode : null}
          onConnect={handleConnectWithType}
          onCancel={() => {
            setInteractionMode('normal');
            setEdgeSource(null);
            setSelectedNode(null);
          }}
        />
      ) : null}

      {/* Process Execution Panel */}
      {processExecutionNode && (
        <ProcessExecutionPanel
          node={nodes.find(n => n.id === processExecutionNode) || null}
          onClose={() => {
            setProcessExecutionNode(null);
            setSelectedNode(null);
          }}
          onExecute={async (nodeId, generationType, execOptions) => {
            try {
              const response = await fetch(`/api/grpc/graph/process/${nodeId}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  generationType,
                  options: execOptions,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Process execution failed');
              }

              await loadGraphData();
            } catch (err) {
              console.error('Process execution error:', err);
              throw err;
            }
          }}
        />
      )}

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

      {/* Story Element FAB */}
      <StoryElementFAB
        isOpen={fabOpen}
        onToggle={() => setFabOpen(!fabOpen)}
        onSelectType={handleNodeTypeSelect}
      />

      {/* Side Panel - Story Element Editor */}
      {sidePanelOpen && (
        <div className="absolute top-0 right-0 w-96 h-full z-10">
          <StoryElementEditor
            node={selectedNodeData ? { id: selectedNodeData.id, data: selectedNodeData.data } : null}
            onSave={handleUpdateNode}
            onClose={() => {
              setSidePanelOpen(false);
              setSelectedNode(null);
            }}
          />
        </div>
      )}

      {/* Inline Label Editor */}
      {editingNodeId && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 z-50"
          style={{
            left: nodes.find(n => n.id === editingNodeId)?.position.x || 0,
            top: (nodes.find(n => n.id === editingNodeId)?.position.y || 0) - 40,
          }}
        >
          <input
            type="text"
            value={editingLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdateNode(editingNodeId, { label: editingLabel });
                setEditingNodeId(null);
                setEditingLabel('');
              } else if (e.key === 'Escape') {
                setEditingNodeId(null);
                setEditingLabel('');
              }
            }}
            onBlur={() => {
              if (editingLabel) {
                handleUpdateNode(editingNodeId, { label: editingLabel });
              }
              setEditingNodeId(null);
              setEditingLabel('');
            }}
            autoFocus
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
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

