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

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

type InteractionMode = 'normal' | 'addNode' | 'addEdge' | 'selectSource' | 'selectTarget';

export default function GraphVisualization({ projectId }: GraphVisualizationProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [contextLayers, setContextLayers] = useState<ContextLayer[]>([]);
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
  const [showHierarchy, setShowHierarchy] = useState(true);
  
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const layoutCalculatedRef = useRef(false);

  // Force-directed + Layer layout計算
  const calculateLayout = useCallback((
    nodes: GraphNode[],
    edges: GraphEdge[],
    layers: ContextLayer[],
    width: number,
    height: number
  ): { positions: Map<string, { x: number; y: number }>; layerBounds: Map<string, ContextLayer> } => {
    const positions = new Map<string, { x: number; y: number }>();
    const layerBounds = new Map<string, ContextLayer>();
    
    if (nodes.length === 0) return { positions, layerBounds };

    // 1. Layer layout: 階層に基づいてY座標を初期化
    const maxDepth = Math.max(...nodes.map(n => n.depth || 0));
    const layerHeight = maxDepth > 0 ? height / (maxDepth + 1) : height;
    const layerPadding = 50;

    // Contextノードを各レイヤーの最上部に配置
    const contextNodes = nodes.filter(n => n.isContext);
    const nonContextNodes = nodes.filter(n => !n.isContext);

    // Contextノードの配置
    const contextSpacing = width / (contextNodes.length + 1);
    contextNodes.forEach((node, index) => {
      positions.set(node.id, {
        x: contextSpacing * (index + 1),
        y: layerPadding,
      });
    });

    // 各context layer内のノードを配置
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nonContextNodes.filter(n => n.contextId === layer.contextNodeId);
      const contextNode = nodes.find(n => n.id === layer.contextNodeId);
      if (!contextNode) return;

      const contextX = positions.get(contextNode.id)?.x || width / 2;
      const nodesPerRow = Math.ceil(Math.sqrt(layerNodes.length));
      const nodeSpacing = Math.min(150, (width - 200) / nodesPerRow);

      layerNodes.forEach((node, index) => {
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;
        const depth = node.depth || 1;
        
        positions.set(node.id, {
          x: contextX - (nodesPerRow * nodeSpacing) / 2 + col * nodeSpacing + (Math.random() - 0.5) * 20,
          y: layerPadding + depth * layerHeight + row * 40 + (Math.random() - 0.5) * 20,
        });
      });

      // Context layerの境界を計算
      const layerNodePositions = layerNodes.map(n => positions.get(n.id)).filter(Boolean) as { x: number; y: number }[];
      if (layerNodePositions.length > 0) {
        const minX = Math.min(...layerNodePositions.map(p => p.x)) - 30;
        const maxX = Math.max(...layerNodePositions.map(p => p.x)) + 30;
        const minY = Math.min(...layerNodePositions.map(p => p.y)) - 30;
        const maxY = Math.max(...layerNodePositions.map(p => p.y)) + 30;
        
        layerBounds.set(layer.contextNodeId, {
          ...layer,
          bounds: { minX, minY, maxX, maxY },
        });
      }
    });

    // Contextに属さないノードの配置
    const orphanNodes = nonContextNodes.filter(n => !n.contextId);
    orphanNodes.forEach((node, index) => {
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x: Math.random() * width,
          y: layerPadding + (node.depth || 1) * layerHeight,
        });
      }
    });

    // 2. Force-directed: 反復的に位置を更新
    const iterations = 100;
    const k = Math.sqrt((width * height) / nodes.length);
    const temperature = width / 10;
    let currentTemp = temperature;

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { fx: number; fy: number }>();
      
      nodes.forEach(node => {
        forces.set(node.id, { fx: 0, fy: 0 });
      });

      // 反発力（全ノード間）
      nodes.forEach((node1, i) => {
        nodes.slice(i + 1).forEach(node2 => {
          const pos1 = positions.get(node1.id)!;
          const pos2 = positions.get(node2.id)!;
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = k * k / distance;
          
          const fx1 = (dx / distance) * force;
          const fy1 = (dy / distance) * force;
          const fx2 = -fx1;
          const fy2 = -fy1;

          const f1 = forces.get(node1.id)!;
          const f2 = forces.get(node2.id)!;
          f1.fx -= fx1;
          f1.fy -= fy1;
          f2.fx -= fx2;
          f2.fy -= fy2;
        });
      });

      // 引力（エッジで接続されたノード間）
      edges.forEach(edge => {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = distance / k;

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        const f1 = forces.get(edge.source)!;
        const f2 = forces.get(edge.target)!;
        f1.fx += fx;
        f1.fy += fy;
        f2.fx -= fx;
        f2.fy -= fy;
      });

      // Contextノードとその下層ノード間の強い引力
      layers.forEach(layer => {
        const contextPos = positions.get(layer.contextNodeId);
        if (!contextPos) return;

        layer.containedNodeIds.forEach(nodeId => {
          const nodePos = positions.get(nodeId);
          if (!nodePos) return;

          const dx = nodePos.x - contextPos.x;
          const dy = nodePos.y - contextPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance / k) * 2; // 2倍の引力

          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          const fContext = forces.get(layer.contextNodeId)!;
          const fNode = forces.get(nodeId)!;
          fContext.fx += fx;
          fContext.fy += fy;
          fNode.fx -= fx;
          fNode.fy -= fy;
        });
      });

      // 位置を更新
      nodes.forEach(node => {
        const force = forces.get(node.id)!;
        const pos = positions.get(node.id)!;
        
        // 温度による減衰
        const damping = 0.9;
        pos.x += force.fx * currentTemp * damping;
        pos.y += force.fy * currentTemp * damping;

        // 境界制約
        pos.x = Math.max(30, Math.min(width - 30, pos.x));
        pos.y = Math.max(30, Math.min(height - 30, pos.y));

        // Context layer内のノードが境界を超えないように制約
        if (node.contextId && !node.isContext) {
          const layer = layerBounds.get(node.contextId);
          if (layer) {
            const bounds = layer.bounds;
            if (bounds.minX > 0 && bounds.maxX > 0) {
              pos.x = Math.max(bounds.minX, Math.min(bounds.maxX, pos.x));
              pos.y = Math.max(bounds.minY, Math.min(bounds.maxY, pos.y));
            }
          }
        }
      });

      currentTemp *= 0.95; // 温度を下げる
    }

    // Context layerの境界を再計算
    layers.forEach(layer => {
      const layerNodes = nonContextNodes.filter(n => n.contextId === layer.contextNodeId);
      const layerNodePositions = layerNodes.map(n => positions.get(n.id)).filter(Boolean) as { x: number; y: number }[];
      const contextPos = positions.get(layer.contextNodeId);
      
      if (layerNodePositions.length > 0 && contextPos) {
        const allPositions = [contextPos, ...layerNodePositions];
        const minX = Math.min(...allPositions.map(p => p.x)) - 40;
        const maxX = Math.max(...allPositions.map(p => p.x)) + 40;
        const minY = Math.min(...allPositions.map(p => p.y)) - 40;
        const maxY = Math.max(...allPositions.map(p => p.y)) + 40;
        
        layerBounds.set(layer.contextNodeId, {
          ...layer,
          bounds: { minX, minY, maxX, maxY },
        });
      }
    });

    return { positions, layerBounds };
  }, []);

  useEffect(() => {
    loadGraphData();
  }, [projectId]);

  // レイアウト計算（階層ビューが有効な場合）
  useEffect(() => {
    if (showHierarchy && nodes.length > 0 && containerRef.current && !layoutCalculatedRef.current) {
      layoutCalculatedRef.current = true;
      
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight || 600;
      
      const { positions, layerBounds } = calculateLayout(
        nodes,
        edges,
        contextLayers,
        width,
        height
      );

      // 位置を更新
      const updatedNodes = nodes.map(node => {
        const pos = positions.get(node.id);
        if (pos) {
          return { ...node, x: pos.x, y: pos.y };
        }
        return node;
      });
      setNodes(updatedNodes);

      // Context layerの境界を更新
      const updatedLayers = contextLayers.map(layer => {
        const updated = layerBounds.get(layer.contextNodeId);
        return updated || layer;
      });
      setContextLayers(updatedLayers);
      
      setTimeout(() => {
        layoutCalculatedRef.current = false;
      }, 100);
    } else if (!showHierarchy) {
      layoutCalculatedRef.current = false;
    }
  }, [showHierarchy, nodes.length, edges.length, contextLayers.length, calculateLayout]);

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
  const analyzeContextNodes = (nodes: GraphNode[]): GraphNode[] => {
    return nodes.map(node => {
      let jsonld: any = null;
      try {
        jsonld = typeof node.properties.jsonld === 'string' 
          ? JSON.parse(node.properties.jsonld) 
          : node.properties.jsonld || node.properties;
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
        isContext: !!hasContext,
        contextData,
      };
    });
  };

  // 階層構築関数
  const buildHierarchy = (
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): { nodes: GraphNode[]; contextLayers: ContextLayer[] } => {
    const contextNodes = nodes.filter(n => n.isContext);
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(n => {
      nodeMap.set(n.id, { ...n, children: [], depth: 0 });
    });

    // エッジから親子関係を構築
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        if (!source.children) source.children = [];
        source.children.push(target.id);
        if (!target.parent) target.parent = source.id;
      }
    });

    // Contextノードをルートとして階層の深さを計算
    const calculateDepth = (nodeId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      
      if (node.isContext) {
        node.depth = 0;
        return 0;
      }

      if (node.parent) {
        const parentDepth = calculateDepth(node.parent, visited);
        node.depth = parentDepth + 1;
        return node.depth;
      }

      // Contextノードを探す（エッジを辿って）
      const findContextDepth = (currentId: string, depth: number, path: Set<string>): number => {
        if (path.has(currentId)) return depth;
        path.add(currentId);
        
        const currentNode = nodeMap.get(currentId);
        if (currentNode?.isContext) return depth;
        
        // 親を探す
        const parentEdge = edges.find(e => e.target === currentId);
        if (parentEdge) {
          return findContextDepth(parentEdge.source, depth + 1, path);
        }
        
        return depth;
      };

      const depth = findContextDepth(nodeId, 0, new Set());
      node.depth = depth;
      return depth;
    };

    // 各ノードの深さを計算
    nodeMap.forEach((_, nodeId) => {
      calculateDepth(nodeId);
    });

    // Context layerの構築
    const contextLayers: ContextLayer[] = contextNodes.map(contextNode => {
      // このcontextに属するノードを探す（エッジを辿って）
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
        if (node.children) {
          node.children.forEach(childId => {
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
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, // 後で計算
      };
    });

    // Context IDを各ノードに設定
    nodeMap.forEach((node, nodeId) => {
      if (!node.isContext) {
        const contextLayer = contextLayers.find(layer => 
          layer.containedNodeIds.includes(nodeId)
        );
        if (contextLayer) {
          node.contextId = contextLayer.contextNodeId;
        }
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      contextLayers,
    };
  };

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

      // Parse nodes
      if (Array.isArray(nodesResult)) {
        nodesResult.forEach((row: any) => {
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
            
            const node: GraphNode = {
              id: row.id,
              label: row.label || '',
              properties,
              x: Math.random() * 400 + 100,
              y: Math.random() * 300 + 100,
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
            });
          }
        });
      }
      
      // Context検出と階層構築
      const nodesWithContext = analyzeContextNodes(parsedNodes);
      const { nodes: nodesWithHierarchy, contextLayers: builtLayers } = buildHierarchy(nodesWithContext, parsedEdges);
      
      setNodes(nodesWithHierarchy);
      setEdges(parsedEdges);
      setContextLayers(builtLayers);
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

    // Draw context layers (背景として最初に描画)
    if (showHierarchy) {
      contextLayers.forEach((layer, index) => {
        const bounds = layer.bounds;
        if (bounds.minX > 0 && bounds.maxX > 0 && bounds.minY > 0 && bounds.maxY > 0) {
          // 半透明の背景
          ctx.fillStyle = isDarkMode 
            ? `rgba(245, 158, 11, 0.1)` 
            : `rgba(245, 158, 11, 0.15)`;
          ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
          
          // 境界線
          ctx.strokeStyle = isDarkMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
          ctx.setLineDash([]);
          
          // Contextノードのラベル
          const contextNode = nodes.find(n => n.id === layer.contextNodeId);
          if (contextNode) {
            ctx.fillStyle = isDarkMode ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.9)';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(
              `Context: ${contextNode.label}`,
              bounds.minX + 5,
              bounds.minY - 5
            );
          }
        }
      });
    }

    // Draw edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const x1 = sourceNode.x || 0;
        const y1 = sourceNode.y || 0;
        const x2 = targetNode.x || 0;
        const y2 = targetNode.y || 0;

        // Context関係のエッジは点線で
        const isContextEdge = sourceNode.isContext || targetNode.isContext;
        
        ctx.strokeStyle = edge.id === selectedEdge 
          ? '#3b82f6' 
          : isDarkMode ? '#9ca3af' : '#6b7280';
        ctx.lineWidth = edge.id === selectedEdge ? 3 : (isContextEdge ? 2 : 1);
        
        if (isContextEdge) {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw edge label
        if (edge.label) {
          ctx.fillStyle = isDarkMode ? '#d1d5db' : '#374151';
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
      const isContext = node.isContext || false;

      // Contextノードは特別な色と形状
      if (isContext) {
        // 六角形を描画
        const radius = 25;
        ctx.fillStyle = isSelected ? '#f59e0b' : '#f59e0b';
        ctx.strokeStyle = isSelected ? '#d97706' : '#d97706';
        ctx.lineWidth = isSelected ? 4 : 3;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const px = x + radius * Math.cos(angle);
          const py = y + radius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Contextアイコン
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('@', x, y + 6);
      } else {
        // 通常のノード
        ctx.fillStyle = isSelected ? '#3b82f6' : isSource ? '#10b981' : '#6366f1';
        ctx.strokeStyle = isSelected ? '#1e40af' : '#4f46e5';
        ctx.lineWidth = isSelected ? 3 : 2;

        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw node label
      ctx.fillStyle = isContext ? '#ffffff' : '#ffffff';
      ctx.font = isContext ? 'bold 11px sans-serif' : 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const labelY = isContext ? y + 40 : y + 5;
      ctx.fillText(
        node.label.substring(0, isContext ? 12 : 8),
        x,
        labelY
      );
    });

    // Draw mode indicator
    if (interactionMode !== 'normal') {
      ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 40);
      ctx.fillStyle = isDarkMode ? '#f3f4f6' : '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      const modeText = 
        interactionMode === 'addNode' ? 'Click to add node' :
        interactionMode === 'selectSource' ? 'Select source node' :
        interactionMode === 'selectTarget' ? 'Select target node' :
        '';
      ctx.fillText(modeText, 20, 35);
    }
  }, [nodes, edges, selectedNode, selectedEdge, edgeSource, interactionMode, isDarkMode, showHierarchy, contextLayers, calculateLayout]);

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

  // Don't early return - show empty state with FAB and UI elements

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
          {nodes.length === 0 && edges.length === 0 && !loading ? (
            <div className="w-full h-[600px] flex items-center justify-center relative">
              <div className="text-center z-10">
                <p className="text-gray-600 dark:text-gray-400 mb-2 text-lg font-medium">No graph data found.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  Click the <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-xs leading-6">+</span> button below to add your first node.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  Or use the toolbar buttons above to add nodes and edges.
                </p>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedNode ? 'Edit Node' : 'Create Node'}
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

            {selectedNode ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label</label>
                  <input
                    type="text"
                    value={selectedNodeData?.label || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    readOnly
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Properties</label>
                  <textarea
                    value={JSON.stringify(selectedNodeData?.properties || {}, null, 2)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={6}
                    readOnly
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label *</label>
                  <input
                    type="text"
                    value={nodeForm.label}
                    onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Node label"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Properties (JSON)</label>
                  <textarea
                    value={nodeForm.properties}
                    onChange={(e) => setNodeForm({ ...nodeForm, properties: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    rows={4}
                    placeholder='{"key": "value"}'
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">JSON-LD (JSON)</label>
                  <textarea
                    value={nodeForm.jsonld}
                    onChange={(e) => setNodeForm({ ...nodeForm, jsonld: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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

      {/* Edge Form Modal */}
      {interactionMode === 'selectTarget' && edgeSource && !edgeForm.label && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setInteractionMode('normal');
          setEdgeSource(null);
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Create Edge</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Source: {nodes.find(n => n.id === edgeSource)?.label || edgeSource}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click on a target node to create the edge, or enter label below and click a node.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Label *</label>
              <input
                type="text"
                value={edgeForm.label}
                onChange={(e) => setEdgeForm({ ...edgeForm, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Edge label (e.g., relatedTo, knows)"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Properties (JSON)</label>
              <textarea
                value={edgeForm.properties}
                onChange={(e) => setEdgeForm({ ...edgeForm, properties: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
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
          <span className="ml-4 text-blue-600 dark:text-blue-400">
            Mode: {interactionMode}
          </span>
        )}
      </div>
    </div>
  );
}
