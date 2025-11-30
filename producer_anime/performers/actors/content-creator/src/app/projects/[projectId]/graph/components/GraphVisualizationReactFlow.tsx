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
import { listGraphNodes, listGraphEdges, createGraphNode, createGraphEdge, deleteGraphEdge, getGraphNode, updateGraphNode } from '@/internal/grpc/services/graph_client';
import { classifyError, formatErrorForDisplay, logError, ErrorType } from '@/utils/errorHandling';
import ContextNode from './ContextNode';
import ContextEdge from './ContextEdge';
import StoryElementNode from './StoryElementNode';
import StoryElementEdge from './StoryElementEdge';
import StoryElementEditor from './StoryElementEditor';
import StoryElementFAB from './StoryElementFAB';
import StoryElementConnection from './StoryElementConnection';
import ProcessExecutionPanel from './ProcessExecutionPanel';
import ContextLayerBackground from './ContextLayerBackground';
import ContextLayerSidebar from './ContextLayerSidebar';
import DebugPanel from './DebugPanel';
import { useForceDirectedLayout } from './useForceDirectedLayout';
import { useStoryElementLayout } from './useStoryElementLayout';
import { GraphNodeData, StoryElementNodeType, StoryElementEdgeType, ELEMENT_TYPE_LABELS, ContextLayer } from './types';
import { getNodeTypeMetadata, getDefaultContextLayerIds, validateRequiredContextLayers } from './nodeTypeDependencies';

interface GraphVisualizationProps {
  projectId: string;
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
  const [debugLogs, setDebugLogs] = useState<Array<{ timestamp: number; level: 'log' | 'error' | 'warn' | 'info'; message: string; data?: any }>>([]);

  // デバッグログを追加する関数
  const addDebugLog = useCallback((level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any) => {
    const log = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };
    setDebugLogs(prev => [...prev, log].slice(-200)); // 最新200件まで保持
    console[level](`[GraphVisualizationReactFlow] ${message}`, data || '');
  }, []);
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
  const [isLayouting, setIsLayouting] = useState(false);
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
      let jsonld: Record<string, unknown> | null = null;
      try {
        const nodeData = node.data as unknown as GraphNodeData;
        const props = nodeData?.properties as Record<string, unknown> | undefined;
        jsonld = typeof props?.jsonld === 'string' 
          ? JSON.parse(props.jsonld as string) 
          : (props?.jsonld as Record<string, unknown>) || props;
      } catch (e) {
        // JSON parse error - skip
      }

      const hasContext = jsonld && jsonld['@context'];
      
      let contextData: { version?: number; prefixes?: Record<string, string> } | undefined;
      if (hasContext && jsonld) {
        const context = jsonld['@context'] as Record<string, unknown> | undefined;
        if (typeof context === 'object' && context !== null) {
          const version = context['@version'] as number | undefined;
          const prefixes = Object.keys(context).reduce((acc, key) => {
            if (!key.startsWith('@') && typeof context[key] === 'string') {
              acc[key] = context[key] as string;
            }
            return acc;
          }, {} as Record<string, string>);
          contextData = {
            ...(version !== undefined && { version }),
            ...(Object.keys(prefixes).length > 0 && { prefixes }),
          };
        }
      }

      return {
        ...node,
        type: hasContext ? 'context' : 'default',
        data: {
          ...node.data,
          isContext: !!hasContext,
          ...(contextData && { contextData }),
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
    console.log('[GraphVisualizationReactFlow] buildHierarchy: Starting', {
      totalNodes: nodes.length,
      contextNodesCount: contextNodes.length,
      contextNodeIds: contextNodes.map(n => ({ id: n.id, label: n.data.label })),
      edgesCount: edges.length,
    });
    
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

    // Context layerの構築（複数のコンテクストレイヤーへの所属をサポート）
    const contextLayers: ContextLayer[] = contextNodes.map((contextNode, index) => {
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
      // usesContext または belongsTo エッジを検出
      edges.forEach(edge => {
        const edgeData = edge.data as { edgeType?: string } | undefined;
        const edgeType = edgeData?.edgeType || '';
        const edgeLabel = edge.label || '';
        
        // Contextノードから出るエッジ、またはusesContext/belongsToエッジを検出
        if (edge.source === contextNode.id) {
          traverse(edge.target);
        } else if (
          edge.target === contextNode.id &&
          (edgeType === 'belongsTo' || edgeLabel === 'usesContext' || edgeLabel === 'belongsTo')
        ) {
          // ノードからコンテクストノードへのエッジ（多対多の関係）
          containedNodeIds.add(edge.source);
        }
      });
      
      const layer = {
        contextNodeId: contextNode.id,
        containedNodeIds: Array.from(containedNodeIds),
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        visible: true,
        order: index,
      };
      
      console.log('[GraphVisualizationReactFlow] buildHierarchy: Created layer', {
        contextNodeId: layer.contextNodeId,
        contextNodeLabel: contextNode.data.label,
        containedNodeIdsCount: layer.containedNodeIds.length,
        containedNodeIds: layer.containedNodeIds.slice(0, 5), // 最初の5つだけ表示
      });
      
      return layer;
    });

    // 全てのノードがコンテクストレイヤーに属しているか確認
    const allNonContextNodeIds = new Set(
      nodes.filter(n => !n.data.isContext).map(n => n.id)
    );
    const nodesInLayers = new Set(
      contextLayers.flatMap(layer => layer.containedNodeIds)
    );
    const orphanNodes = Array.from(allNonContextNodeIds).filter(
      nodeId => !nodesInLayers.has(nodeId)
    );

    if (orphanNodes.length > 0) {
      console.warn('[buildHierarchy] Orphan nodes found (nodes not in any context layer):', {
        orphanNodeIds: orphanNodes,
        orphanNodeLabels: orphanNodes.map(id => {
          const node = nodeMap.get(id);
          return node ? node.data.label : 'Unknown';
        }),
        totalNodes: allNonContextNodeIds.size,
        nodesInLayers: nodesInLayers.size,
        orphanCount: orphanNodes.length,
      });
      
      // デバッグログに記録
      if (addDebugLog) {
        addDebugLog('warn', 'buildHierarchy: Orphan nodes detected', {
          orphanNodeIds: orphanNodes,
          orphanNodeLabels: orphanNodes.map(id => {
            const node = nodeMap.get(id);
            return node ? node.data.label : 'Unknown';
          }),
          totalNodes: allNonContextNodeIds.size,
          nodesInLayers: nodesInLayers.size,
          orphanCount: orphanNodes.length,
        });
      }
    }

    // Context IDsを各ノードに設定（複数のコンテクストレイヤーへの所属をサポート）
    const nodeContextMap = new Map<string, Set<string>>();
    
    // エッジから直接的なコンテクストレイヤーへの所属を検出
    edges.forEach(edge => {
      const edgeData = edge.data as any;
      const edgeType = edgeData?.edgeType || '';
      const edgeLabel = edge.label || '';
      
      // usesContext または belongsTo エッジを検出
      if (edgeType === 'belongsTo' || edgeLabel === 'usesContext' || edgeLabel === 'belongsTo') {
        const targetNode = nodeMap.get(edge.target);
        if (targetNode?.data.isContext) {
          // ノードからコンテクストノードへのエッジ
          if (!nodeContextMap.has(edge.source)) {
            nodeContextMap.set(edge.source, new Set());
          }
          nodeContextMap.get(edge.source)!.add(edge.target);
        }
      }
      
      // Contextノードから出るエッジ（階層構造）
      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode?.data.isContext) {
        // コンテクストノードから出るエッジのターゲットノードも所属とみなす
        if (!nodeContextMap.has(edge.target)) {
          nodeContextMap.set(edge.target, new Set());
        }
        nodeContextMap.get(edge.target)!.add(edge.source);
      }
    });
    
    // ノードにcontextIds配列を設定
    nodeMap.forEach((node, nodeId) => {
      if (!node.data.isContext) {
        const contextIdsSet = nodeContextMap.get(nodeId);
        if (contextIdsSet && contextIdsSet.size > 0) {
          node.data.contextIds = Array.from(contextIdsSet);
          // 後方互換性のため、最初のcontextIdも設定
          const firstContextId = Array.from(contextIdsSet)[0];
          if (firstContextId) {
            node.data.contextId = firstContextId;
          }
        } else {
          // 既存のロジック（階層構造から検出）
          const contextLayer = contextLayers.find(layer => 
            layer.containedNodeIds.includes(nodeId)
          );
          if (contextLayer) {
            node.data.contextId = contextLayer.contextNodeId;
            node.data.contextIds = [contextLayer.contextNodeId];
          }
        }
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      contextLayers,
    };
  }, [addDebugLog]);

  const loadGraphData = async () => {
    setLoading(true);
    setError(null);
    addDebugLog('info', 'loadGraphData: Starting...', { projectId });
    
    try {
      // Load nodes using listGraphNodes API
      console.log('[GraphVisualizationReactFlow] loadGraphData: Loading nodes...');
      const nodesList = await listGraphNodes(100, 0);
      console.log('[GraphVisualizationReactFlow] loadGraphData: Nodes loaded:', {
        count: nodesList.length,
        firstNode: nodesList.length > 0 ? nodesList[0] : null,
      });
      
      // Load edges using listGraphEdges API
      console.log('[GraphVisualizationReactFlow] loadGraphData: Loading edges...');
      const edgesList = await listGraphEdges(200, 0);
      console.log('[GraphVisualizationReactFlow] loadGraphData: Edges loaded:', {
        count: edgesList.length,
        firstEdge: edgesList.length > 0 ? edgesList[0] : null,
      });
      
      const parsedNodes: Node<GraphNodeData>[] = [];
      const parsedEdges: Edge[] = [];

      // Parse nodes
      if (nodesList.length === 0) {
        console.log('[GraphVisualizationReactFlow] loadGraphData: No nodes found in database');
      }
      
      if (nodesList.length > 0) {
        nodesList.forEach((node: any, index: number) => {
          if (node.id) {
            // propertiesとjsonldは既にパース済み
            const properties = node.properties || {};
            const parsedJsonld = node.jsonld || {};
            
            // properties.jsonldにも設定（後方互換性のため）
            properties.jsonld = parsedJsonld;
            
            // Determine node type from properties or jsonld
            const jsonld = parsedJsonld || properties.jsonld || {};
            
            // デバッグログ: ノードデータの確認（詳細版）
            const debugData = {
              nodeId: node.id,
              label: node.label,
              rawProperties: JSON.stringify(properties).substring(0, 200),
              parsedProperties: properties,
              rawJsonld: JSON.stringify(parsedJsonld).substring(0, 200),
              parsedJsonld: jsonld,
              jsonldType: jsonld['@type'],
              jsonldTypeType: typeof jsonld['@type'],
              propertiesIsContext: properties.isContext,
              propertiesIsContextType: typeof properties.isContext,
              hasContext: !!jsonld['@context'],
              jsonldKeys: Object.keys(jsonld),
            };
            
            // コンテクストノードの検出を改善
            const check1 = jsonld['@type'] === 'gh:Context';
            const check2 = Array.isArray(jsonld['@type']) && jsonld['@type'].includes('gh:Context');
            const check3 = properties.isContext === true;
            const check4 = typeof jsonld['@type'] === 'string' && jsonld['@type'].includes('Context');
            const check5 = jsonld['@context'] && typeof jsonld['@context'] === 'object';
            
            const isContext = check1 || check2 || check3 || check4 || check5;
            
            // デバッグログ: コンテクストノードの検出（詳細版）
            const checkResults = { check1, check2, check3, check4, check5 };
            if (isContext) {
              addDebugLog('info', `loadGraphData: ✅ Context node detected for ${node.id}`, {
                ...debugData,
                checkResults,
                isContext: true,
              });
            } else {
              // コンテクストノードとして検出されなかった理由を詳しく記録
              const failureReasons: string[] = [];
              if (!check1 && jsonld['@type']) {
                failureReasons.push(`@type is "${jsonld['@type']}" (expected "gh:Context")`);
              }
              if (!check3 && properties.isContext !== undefined) {
                failureReasons.push(`properties.isContext is ${properties.isContext} (expected true)`);
              }
              if (!check5 && !jsonld['@context']) {
                failureReasons.push('@context is missing');
              }
              
              addDebugLog('log', `loadGraphData: ❌ Node ${node.id} is NOT a context node`, {
                ...debugData,
                checkResults,
                isContext: false,
                failureReasons: failureReasons.length > 0 ? failureReasons : ['All checks failed'],
                // クイックデバッグ用の要約
                summary: {
                  label: node.label,
                  hasJsonld: !!node.jsonld,
                  jsonldType: jsonld['@type'],
                  propertiesIsContext: properties.isContext,
                  hasContext: !!jsonld['@context'],
                },
              });
            }
            
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
            let position: { x: number; y: number };
            
            if (savedPosition && typeof savedPosition === 'object' && 
                typeof savedPosition.x === 'number' && 
                typeof savedPosition.y === 'number') {
              // 保存位置がある場合は使用（後でレイアウトアルゴリズムで重なりチェックされる）
              position = { x: savedPosition.x, y: savedPosition.y };
            } else {
              // 保存位置がない場合、グリッドベースの初期位置を生成
              // ノードのインデックスに基づいて配置（後でレイアウトアルゴリズムで調整される）
              const nodesPerRow = Math.ceil(Math.sqrt(nodesList.length));
              const row = Math.floor(index / nodesPerRow);
              const col = index % nodesPerRow;
              const spacing = 150; // ノード間の間隔
              position = {
                x: 100 + col * spacing,
                y: 100 + row * spacing
              };
            }
            
            const reactFlowNode: Node<GraphNodeData> = {
              id: node.id,
              type: isContext ? 'context' : (nodeType ? 'storyElement' : 'default'),
              position,
              data: {
                label: node.label || '',
                ...(nodeType && { nodeType }),
                properties,
                jsonld: jsonld,
                isContext,
                ...(isContext && jsonld && jsonld['@context'] && {
                  contextData: {
                    version: (jsonld['@context'] as Record<string, unknown>)['@version'] as number || 1,
                    prefixes: (jsonld['@context'] as Record<string, unknown>)['prefixes'] as Record<string, string> || {},
                  },
                }),
              },
            };
            parsedNodes.push(reactFlowNode);
          }
        });
      }

      // Parse edges
      if (edgesList.length === 0) {
        console.log('[GraphVisualizationReactFlow] loadGraphData: No edges found in database');
      }
      
      if (edgesList.length > 0) {
        edgesList.forEach((edge: any) => {
          if (edge.id && edge.source && edge.target) {
            // propertiesは既にパース済み
            const edgeProperties = edge.properties || {};
            
            // Determine edge type from properties or label
            let edgeType: StoryElementEdgeType = edgeProperties.edgeType || 'relatesTo';
            if (!edgeProperties.edgeType) {
              const label = (edge.label || '').toLowerCase();
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
              id: edge.id,
              source: edge.source,
              target: edge.target,
              label: edge.label || '',
              type: edgeType ? 'storyElement' : 'default',
              animated: false,
              data: {
                label: edge.label || '',
                edgeType,
                properties: edgeProperties,
              },
            });
          }
        });
      }
      
      // ノードが0件の場合でもエラーにしない（初期状態として正常）
      if (parsedNodes.length === 0) {
        console.log('[GraphVisualizationReactFlow] loadGraphData: No nodes parsed, initializing empty graph');
      }
      
      // Context検出と階層構築
      const contextNodesBeforeAnalysis = parsedNodes.filter(n => n.data.isContext);
      addDebugLog('info', 'loadGraphData: Analyzing context nodes', {
        totalNodes: parsedNodes.length,
        contextNodesCount: contextNodesBeforeAnalysis.length,
        contextNodeIds: contextNodesBeforeAnalysis.map(n => ({ 
          id: n.id, 
          label: n.data.label,
          isContext: n.data.isContext,
          jsonld: (n.data as GraphNodeData).jsonld,
        })),
      });
      
      const nodesWithContext = analyzeContextNodes(parsedNodes);
      const contextNodesAfterAnalysis = nodesWithContext.filter(n => {
        const nodeData = n.data as unknown as GraphNodeData;
        return nodeData.isContext === true;
      });
      
      addDebugLog('info', 'loadGraphData: After analyzeContextNodes', {
        totalNodes: nodesWithContext.length,
        contextNodesCount: contextNodesAfterAnalysis.length,
        contextNodeIds: contextNodesAfterAnalysis.map(n => ({ 
          id: n.id, 
          label: (n.data as unknown as GraphNodeData).label,
          isContext: (n.data as unknown as GraphNodeData).isContext,
        })),
      });
      
      const { nodes: nodesWithHierarchy, contextLayers: builtLayers } = buildHierarchy(nodesWithContext, parsedEdges);
      
      addDebugLog('info', 'loadGraphData: Built context layers', {
        layersCount: builtLayers.length,
        layers: builtLayers.map(l => ({
          contextNodeId: l.contextNodeId,
          label: nodesWithHierarchy.find(n => n.id === l.contextNodeId)?.data.label,
          containedNodeIds: l.containedNodeIds.length,
        })),
        allContextNodeIds: nodesWithHierarchy
          .filter(n => {
            const nodeData = n.data as unknown as GraphNodeData;
            return nodeData.isContext === true;
          })
          .map(n => n.id),
      });
      
      // Context検出後にエッジタイプを設定
      const updatedEdges = parsedEdges.map(edge => {
        const sourceNode = nodesWithHierarchy.find(n => n.id === edge.source);
        const targetNode = nodesWithHierarchy.find(n => n.id === edge.target);
        return {
          ...edge,
          type: (sourceNode?.data.isContext || targetNode?.data.isContext) ? 'context' : 'default',
        };
      });
      
      // 保存された位置を優先しつつ、レイアウトを適用
      const containerWidth = containerRef.current?.clientWidth || 1200;
      const containerHeight = containerRef.current?.clientHeight || 800;
      
      // まずStoryElementLayoutでタイプベースのレイアウトを適用
      const typeLayoutedNodes = calculateStoryElementLayout(
        nodesWithHierarchy as unknown as Node<GraphNodeData>[],
        updatedEdges,
        builtLayers,
        { width: containerWidth, height: containerHeight }
      );
      
      // その後、Force-directed layoutで重なりを防ぎながら微調整
      const layoutedNodes = calculateForceLayout(
        typeLayoutedNodes,
        updatedEdges,
        builtLayers,
        { width: containerWidth, height: containerHeight }
      );
      
      setNodes(layoutedNodes as unknown as Parameters<typeof setNodes>[0]);
      setEdges(updatedEdges);
      setContextLayers(builtLayers);
      
      addDebugLog('info', 'loadGraphData: Completed successfully', {
        nodesCount: layoutedNodes.length,
        edgesCount: updatedEdges.length,
        contextLayersCount: builtLayers.length,
        contextLayers: builtLayers.map(l => ({
          contextNodeId: l.contextNodeId,
          containedNodeIds: l.containedNodeIds.length,
        })),
      });
      
      setLoading(false);
    } catch (err) {
      // エラーオブジェクトの詳細を取得
      let errorMessage = 'Unknown error';
      let errorStack: string | undefined;
      let errorName: string | undefined;
      let errorDetails: any = null;
      
      if (err instanceof Error) {
        errorMessage = err.message;
        errorStack = err.stack;
        errorName = err.name;
        errorDetails = {
          message: err.message,
          name: err.name,
          stack: err.stack,
          ...(err as any).cause && { cause: (err as any).cause },
        };
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err, null, 2);
        errorDetails = err;
      } else {
        errorMessage = String(err);
      }
      
      addDebugLog('error', 'loadGraphData: Error caught', {
        error: errorMessage,
        errorStack,
        errorName,
        errorDetails,
        errorType: typeof err,
        errorConstructor: err?.constructor?.name,
      });
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.loadGraphData');
      setError(formatErrorForDisplay(appError));
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
      const nodeData = node.data as unknown as GraphNodeData;
      const props = nodeData?.properties as Record<string, unknown> | undefined;
      return nodeData?.nodeType === 'process' &&
             props?.autoExecute === true &&
             props?.executionStatus !== 'running' &&
             props?.executionStatus !== 'completed';
    });

    autoExecuteProcesses.forEach(async (processNode) => {
      try {
        const response = await fetch(`/api/grpc/graph/process/${processNode.id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationType: ((processNode.data as unknown as GraphNodeData)?.properties as Record<string, unknown>)?.generationType as string || 'document',
            options: {},
          }),
        });

        if (response.ok) {
          await loadGraphData();
        }
    } catch (err) {
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.autoExecuteProcesses');
      // 自動実行のエラーは警告のみ（ユーザーに表示しない）
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
            const nodeData = node.data as unknown as GraphNodeData;
            const updatedProperties = {
              ...(nodeData?.properties as Record<string, unknown> || {}),
              position: newPosition,
            };

            await updateGraphNode(
              change.id,
              nodeData?.label || '',
              updatedProperties,
              (nodeData?.jsonld as Record<string, unknown>) || {}
            );

            positionUpdateTimeoutRef.current.delete(change.id);
          } catch (err) {
            const appError = classifyError(err);
            logError(appError, 'GraphVisualizationReactFlow.handleNodesChange');
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
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.handleConnectWithType');
      setError(formatErrorForDisplay(appError));
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

      const nodeData = node.data as unknown as GraphNodeData;
      const updatedProperties = { ...(nodeData?.properties as Record<string, unknown> || {}), ...data.properties };
      const updatedJsonld = { ...(nodeData?.jsonld as Record<string, unknown> || {}), ...data.jsonld };

      await createGraphNode(
        data.label || nodeData?.label || '',
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
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.handleUpdateNode');
      setError(formatErrorForDisplay(appError));
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
      setNodeForm({ label: '', properties: '{}', jsonld: '{}', nodeType: 'character' });
      setSelectedNode(nodeId);
      setSidePanelOpen(true);
    } catch (err) {
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.handleCreateNode');
      setError(formatErrorForDisplay(appError));
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
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.handleCreateEdge');
      setError(formatErrorForDisplay(appError));
    }
  };

  const handleNodeTypeSelect = async (type: StoryElementNodeType) => {
    try {
      const defaultProperties: Record<string, any> = {};
      
      // タイプに応じたデフォルトプロパティを設定
      switch (type) {
        case 'logline':
          defaultProperties.coreConcept = '';
          defaultProperties.hook = '';
          break;
        case 'story':
          defaultProperties.structure = '';
          defaultProperties.theme = '';
          defaultProperties.genre = '';
          break;
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
        case 'cut':
          defaultProperties.shotType = '';
          defaultProperties.duration = 0;
          defaultProperties.transition = '';
          break;
        case 'costume':
          defaultProperties.characterId = '';
          defaultProperties.season = '';
          defaultProperties.occasion = '';
          break;
        case 'camera-angle':
          defaultProperties.angle = 'medium';
          defaultProperties.movement = 'static';
          defaultProperties.focus = '';
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

      // ノードタイプに基づいてデフォルトのコンテクストレイヤーを自動的に割り当て
      const metadata = getNodeTypeMetadata(type);
      const contextNodeArray = nodes.filter(n => {
        const nodeData = n.data as unknown as GraphNodeData;
        return nodeData?.isContext === true;
      }).map(n => {
        const nodeData = n.data as unknown as GraphNodeData;
        return {
          id: n.id,
          label: nodeData?.label || '',
          data: { 
            ...(nodeData?.isContext !== undefined && { isContext: nodeData.isContext }),
          },
        };
      });
      
      // 必須のコンテクストレイヤーをチェック
      const validation = validateRequiredContextLayers(type, contextNodeArray);
      if (!validation.valid) {
        console.warn(`Required context layers missing for ${type}:`, validation.missingLayers);
        // 警告を表示（UIで表示することも可能）
        const errorMessage = `必須のコンテクストレイヤーが存在しません: ${validation.missingLayers.join(', ')}`;
        setError(errorMessage);
        logError(
          {
            type: ErrorType.VALIDATION,
            message: errorMessage,
            details: { missingLayers: validation.missingLayers },
          },
          'GraphVisualizationReactFlow.handleNodeTypeSelect'
        );
      }
      
      // デフォルトのコンテクストレイヤーIDを取得
      const defaultLayerIds = getDefaultContextLayerIds(type, contextNodeArray);
      
      // コンテクストレイヤーへのエッジを作成
      for (const layerId of defaultLayerIds) {
        try {
          await createGraphEdge(nodeId, layerId, 'usesContext', { edgeType: 'belongsTo' });
        } catch (err) {
          console.warn(`Failed to create edge to context layer ${layerId}:`, err);
        }
      }

      await loadGraphData();
      setSelectedNode(nodeId);
      if (type === 'process') {
        setProcessExecutionNode(nodeId);
      } else {
        setSidePanelOpen(true);
      }
    } catch (err) {
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.handleNodeTypeSelect');
      setError(formatErrorForDisplay(appError));
    }
  };

  // ドラッグ&ドロップ階層編集
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    setDraggedNodeId(node.id);
    // HTML5 Drag and Drop API用のデータ転送設定
    if (_event.dataTransfer) {
      _event.dataTransfer.effectAllowed = 'move';
      _event.dataTransfer.setData('application/reactflow-node-id', node.id);
    }
  }, []);

  const onNodeDragStop = useCallback(async (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    // ドラッグ終了時に位置を保存
    try {
      const nodeData = node.data as unknown as GraphNodeData;
      const updatedProperties = {
        ...(nodeData?.properties as Record<string, unknown> || {}),
        position: node.position,
      };

      await updateGraphNode(
        node.id,
        nodeData?.label || '',
        updatedProperties,
        (nodeData?.jsonld as Record<string, unknown>) || {}
      );
    } catch (err) {
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.onNodeDragStop');
      // ドラッグ終了時のエラーは警告のみ（ユーザーに表示しない）
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
        closestNode = n as unknown as Node<GraphNodeData>;
      }
    });

    if (closestNode) {
      try {
        // Contextノードへのドロップ（多対多をサポート）
        const closestNodeTyped = closestNode as Node<GraphNodeData>;
        const closestNodeData = closestNodeTyped.data as unknown as GraphNodeData;
        if (closestNodeData?.isContext) {
          // 既存のusesContextエッジをチェック（既に存在する場合は追加しない）
          const existingContextEdge = edges.find(
            e => e.source === draggedNodeId && 
                 e.target === closestNodeTyped.id &&
                 (e.label === 'usesContext' || e.label === 'belongsTo' || (e.data as any)?.edgeType === 'belongsTo')
          );
          
          if (!existingContextEdge) {
            // 新しいcontext関係を作成（多対多をサポート）
            await handleCreateEdge(draggedNodeId, closestNodeTyped.id, 'usesContext');
          }
        } else {
          // 通常ノードへのドロップ（親子関係）
          // 既存の親子関係を削除
          const existingParentEdge = edges.find(
            e => e.target === draggedNodeId && e.source !== closestNodeTyped.id
          );
          
          if (existingParentEdge) {
            await deleteGraphEdge(existingParentEdge.id);
          }

          // 新しい親子関係を作成
          await handleCreateEdge(closestNodeTyped.id, draggedNodeId, 'hasChild');
        }

        await loadGraphData();
      } catch (err) {
        const appError = classifyError(err);
        logError(appError, 'GraphVisualizationReactFlow.onNodeDragStop');
        setError(formatErrorForDisplay(appError));
      }
    }

    setDraggedNodeId(null);
  }, [draggedNodeId, nodes, edges, handleCreateEdge, loadGraphData, getViewport]);

  // 自動レイアウト実行関数
  const applyAutoLayout = useCallback(async () => {
    if (!containerRef.current || nodes.length === 0 || isLayouting) return;
    
    setIsLayouting(true);
    try {
      const width = containerRef.current.offsetWidth || 800;
      const height = containerRef.current.offsetHeight || 600;
      
      addDebugLog('info', 'Auto Layout: Starting layout calculation', {
        nodesCount: nodes.length,
        edgesCount: edges.length,
        contextLayersCount: contextLayers.length,
        width,
        height,
      });
      
      // 現在のノードを取得（最新の状態を保証）
      const currentNodes = nodes as unknown as Node<GraphNodeData>[];
      
      // まず要素タイプ別レイアウトを適用
      const typeLayoutedNodes = calculateStoryElementLayout(
        currentNodes,
        edges,
        contextLayers,
        { width, height }
      );
      
      // その後、Force-directed layoutで重なりを防ぎながら微調整
      const layoutedNodes = calculateForceLayout(
        typeLayoutedNodes,
        edges,
        contextLayers,
        { width, height }
      );
      
      setNodes(layoutedNodes);
      
      addDebugLog('info', 'Auto Layout: Layout calculation completed', {
        nodesCount: layoutedNodes.length,
      });
      
      // ビューをフィット
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
    } catch (err) {
      const appError = classifyError(err);
      logError(appError, 'GraphVisualizationReactFlow.applyAutoLayout');
      addDebugLog('error', 'Auto Layout: Error during layout calculation', {
        error: appError.message,
      });
    } finally {
      setIsLayouting(false);
    }
  }, [nodes, edges, contextLayers, calculateStoryElementLayout, calculateForceLayout, fitView, setNodes, addDebugLog, isLayouting]);

  // Force-directed + Layer layout適用（階層ビューが有効な場合）
  // 注意: loadGraphData内で既にレイアウトを適用しているため、ここでは初回ロード後のみ実行
  // 初回ロード時のみ実行するため、loadingがfalseになった直後のみ実行
  const hasInitialLayoutRun = useRef(false);
  useEffect(() => {
    if (showHierarchy && nodes.length > 0 && containerRef.current && !loading && !hasInitialLayoutRun.current && !isLayouting) {
      hasInitialLayoutRun.current = true;
      // 初回レイアウトは少し遅延させて、コンテナのサイズが確定してから実行
      const timer = setTimeout(() => {
        if (containerRef.current && nodes.length > 0) {
          const width = containerRef.current.offsetWidth || 800;
          const height = containerRef.current.offsetHeight || 600;
          
          setIsLayouting(true);
          try {
            // まず要素タイプ別レイアウトを適用
            const typeLayoutedNodes = calculateStoryElementLayout(
              nodes as unknown as Node<GraphNodeData>[],
              edges,
              contextLayers,
              { width, height }
            );
            
            // その後、Force-directed layoutで重なりを防ぎながら微調整
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
          } catch (err) {
            const appError = classifyError(err);
            logError(appError, 'GraphVisualizationReactFlow.initialLayout');
          } finally {
            setIsLayouting(false);
          }
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [showHierarchy, loading, nodes.length, edges.length, contextLayers.length, calculateStoryElementLayout, calculateForceLayout, fitView, setNodes, isLayouting]);

  // レイヤー変更ハンドラ
  const handleLayersChange = useCallback((updatedLayers: ContextLayer[]) => {
    setContextLayers(updatedLayers);
  }, []);

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
    <div className="h-[600px] relative">
      {/* Graph Visualization */}
      <div ref={containerRef} className="w-full h-full relative">
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_event, node) => {
          setEditingNodeId(node.id);
          const nodeData = node.data as unknown as GraphNodeData;
          setEditingLabel(nodeData?.label || '');
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
          node={(nodes.find(n => n.id === processExecutionNode) as unknown as Node<GraphNodeData>) || null}
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
              const appError = classifyError(err);
              logError(appError, 'GraphVisualizationReactFlow.ProcessExecutionPanel.onExecute');
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
          <button
            onClick={applyAutoLayout}
            disabled={isLayouting || nodes.length === 0}
            className={`px-4 py-2 rounded-lg ${
              isLayouting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            title="自動レイアウトを実行してノードを再配置します"
          >
            {isLayouting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Layouting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Auto Layout
              </span>
            )}
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
            node={selectedNodeData ? { id: selectedNodeData.id, data: selectedNodeData.data as unknown as GraphNodeData } : null}
            nodes={nodes as unknown as Node<GraphNodeData>[]}
            edges={edges}
            contextLayers={contextLayers}
            onSave={handleUpdateNode}
            onReload={loadGraphData}
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

      {/* Floating Context Layer Sidebar */}
      <div className="absolute top-4 left-4 z-10">
        <ContextLayerSidebar
          projectId={projectId}
          nodes={nodes as unknown as Node<GraphNodeData>[]}
          edges={edges}
          contextLayers={contextLayers}
          onLayersChange={handleLayersChange}
          onNodesChange={handleNodesChange}
          onEdgesChange={setEdges}
          onReload={loadGraphData}
          onDebugLog={addDebugLog}
        />
      </div>

      {/* Debug Panel */}
      <DebugPanel
        projectId={projectId}
        nodes={nodes as unknown as Node<GraphNodeData>[]}
        edges={edges}
        contextLayers={contextLayers}
        debugLogs={debugLogs}
      />
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

