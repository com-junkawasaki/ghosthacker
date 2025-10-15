'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, addEdge, useNodesState, useEdgesState } from '@reactflow/core';
import type { Node as RFNode, Edge as RFEdge, Connection } from '@reactflow/core';
import { Controls } from '@reactflow/controls';
import { Background } from '@reactflow/background';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/routers';

// Additional styles for React Flow (injected via globals.css)
const reactFlowStyles = `
  .react-flow__node {
    min-width: 150px;
    background: #ffffff;
    border: 1px solid #d1d5db; /* stronger border */
    border-radius: 8px;
    padding: 10px;
    color: #111827; /* high-contrast text */
    font-size: 14px; /* base font size */
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
  .react-flow__node.selected {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.4);
  }
  .react-flow__edge-path {
    stroke: #374151; /* darker edges */
    stroke-width: 2.25;
  }
  .react-flow__controls {
    bottom: 20px;
    left: 20px;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
  }
  .react-flow__viewport {
    background: #f9fafb; /* subtle canvas */
  }
  /* bump small Tailwind text utilities inside nodes for readability */
  .react-flow__node .text-xs { font-size: 12px !important; color: #111827 !important; }
  .react-flow__node .text-sm { font-size: 14px !important; color: #111827 !important; }
  .react-flow__node .text-gray-500 { color: #374151 !important; }
  .react-flow__node .text-gray-600 { color: #1f2937 !important; }
  .react-flow__node .font-medium { font-weight: 600; }
`;

import {
  SourceDocNode,
  PromptNode,
  WriterNode,
  ImageGenNode,
  VideoGenNode,
  TTSNode,
  RenderNode,
  WebtoonPanelGen,
  WebtoonLayout,
  WebtoonExport,
  ExportWattpadNode,
  PublishYouTubeNode,
  ProtagonistNode,
  BackstoryNode,
  WorldNode,
} from '@/pipeline/node-types';
import type { NodeData } from '@/pipeline/node-types';
// Saved canvas hydration will be added via API route later

// Define node types for React Flow
const nodeTypes = {
  sourceDoc: SourceDocNode,
  prompt: PromptNode,
  writer: WriterNode,
  imageGen: ImageGenNode,
  webtoonPanelGen: WebtoonPanelGen,
  webtoonLayout: WebtoonLayout,
  webtoonExport: WebtoonExport,
  videoGen: VideoGenNode,
  tts: TTSNode,
  render: RenderNode,
  exportWattpad: ExportWattpadNode,
  publishYouTube: PublishYouTubeNode,
  protagonist: ProtagonistNode,
  backstory: BackstoryNode,
  world: WorldNode,
};

// Initial nodes for the pipeline
const initialNodes: RFNode<NodeData>[] = [
  {
    id: 'source-1',
    type: 'sourceDoc',
    position: { x: 100, y: 100 },
    data: {
      id: 'source-1',
      type: 'sourceDoc',
      label: 'Episode 1',
      status: 'idle',
      config: { episodeId: 'ep1' },
    },
  },
  {
    id: 'protagonist-1',
    type: 'protagonist',
    position: { x: 100, y: 260 },
    data: {
      id: 'protagonist-1',
      type: 'protagonist',
      label: 'Protagonist',
      status: 'idle',
      config: { name: 'Akito', role: 'Hacker', traits: 'Stoic, Empathic' },
    },
  },
  {
    id: 'backstory-1',
    type: 'backstory',
    position: { x: 300, y: 260 },
    data: {
      id: 'backstory-1',
      type: 'backstory',
      label: 'Backstory',
      status: 'idle',
      config: { origin: 'Tokyo underground', motivation: 'Find lost sister', conflict: 'Corporate AI' },
    },
  },
  {
    id: 'world-1',
    type: 'world',
    position: { x: 100, y: 360 },
    data: {
      id: 'world-1',
      type: 'world',
      label: 'World',
      status: 'idle',
      config: { setting: 'Near-future Tokyo', era: '2042', rules: 'Ghost-net protocols' },
    },
  },
  {
    id: 'prompt-1',
    type: 'prompt',
    position: { x: 300, y: 100 },
    data: {
      id: 'prompt-1',
      type: 'prompt',
      label: 'Story Prompt',
      status: 'idle',
      config: { promptType: 'story' },
    },
  },
  {
    id: 'writer-1',
    type: 'writer',
    position: { x: 500, y: 100 },
    data: {
      id: 'writer-1',
      type: 'writer',
      label: 'AI Writer',
      status: 'idle',
    },
  },
  {
    id: 'image-gen-1',
    type: 'imageGen',
    position: { x: 700, y: 50 },
    data: {
      id: 'image-gen-1',
      type: 'imageGen',
      label: 'Image Generation',
      status: 'idle',
    },
  },
  {
    id: 'webtoon-panel-gen-1',
    type: 'webtoonPanelGen',
    position: { x: 900, y: 50 },
    data: {
      id: 'webtoon-panel-gen-1',
      type: 'webtoonPanelGen',
      label: 'Panel Generator',
      status: 'idle',
      config: { panelCount: 8 },
    },
  },
  {
    id: 'webtoon-layout-1',
    type: 'webtoonLayout',
    position: { x: 1100, y: 50 },
    data: {
      id: 'webtoon-layout-1',
      type: 'webtoonLayout',
      label: 'Layout Designer',
      status: 'idle',
      config: { layoutStyle: 'korean-style' },
    },
  },
  {
    id: 'webtoon-export-1',
    type: 'webtoonExport',
    position: { x: 1300, y: 50 },
    data: {
      id: 'webtoon-export-1',
      type: 'webtoonExport',
      label: 'Webtoon Export',
      status: 'idle',
      config: { format: 'webp-sequence' },
    },
  },
  {
    id: 'video-gen-1',
    type: 'videoGen',
    position: { x: 900, y: 100 },
    data: {
      id: 'video-gen-1',
      type: 'videoGen',
      label: 'Video Generation',
      status: 'idle',
      config: { preferredRenderer: 'sora' },
    },
  },
  {
    id: 'tts-1',
    type: 'tts',
    position: { x: 700, y: 150 },
    data: {
      id: 'tts-1',
      type: 'tts',
      label: 'Text-to-Speech',
      status: 'idle',
    },
  },
  {
    id: 'render-1',
    type: 'render',
    position: { x: 1100, y: 100 },
    data: {
      id: 'render-1',
      type: 'render',
      label: 'Video Render',
      status: 'idle',
      config: { renderer: 'ffmpeg' },
    },
  },
  {
    id: 'wattpad-1',
    type: 'exportWattpad',
    position: { x: 1500, y: 50 },
    data: {
      id: 'wattpad-1',
      type: 'exportWattpad',
      label: 'Wattpad Export',
      status: 'idle',
    },
  },
  {
    id: 'youtube-1',
    type: 'publishYouTube',
    position: { x: 1500, y: 150 },
    data: {
      id: 'youtube-1',
      type: 'publishYouTube',
      label: 'YouTube Upload',
      status: 'idle',
    },
  },
];

// Initial edges for the pipeline
const initialEdges: RFEdge[] = [
  { id: 'source-to-prompt', source: 'source-1', target: 'prompt-1' },
  { id: 'protagonist-to-prompt', source: 'protagonist-1', target: 'prompt-1' },
  { id: 'backstory-to-prompt', source: 'backstory-1', target: 'prompt-1' },
  { id: 'world-to-prompt', source: 'world-1', target: 'prompt-1' },
  { id: 'prompt-to-writer', source: 'prompt-1', target: 'writer-1' },
  { id: 'writer-to-image', source: 'writer-1', target: 'image-gen-1' },
  { id: 'world-to-image', source: 'world-1', target: 'image-gen-1' },
  { id: 'writer-to-tts', source: 'writer-1', target: 'tts-1' },
  { id: 'image-to-webtoon-panel', source: 'image-gen-1', target: 'webtoon-panel-gen-1' },
  { id: 'webtoon-panel-to-layout', source: 'webtoon-panel-gen-1', target: 'webtoon-layout-1' },
  { id: 'webtoon-layout-to-export', source: 'webtoon-layout-1', target: 'webtoon-export-1' },
  { id: 'image-to-video', source: 'image-gen-1', target: 'video-gen-1' },
  { id: 'tts-to-video', source: 'tts-1', target: 'video-gen-1' },
  { id: 'video-to-render', source: 'video-gen-1', target: 'render-1' },
  { id: 'render-to-wattpad', source: 'render-1', target: 'wattpad-1' },
  { id: 'render-to-youtube', source: 'render-1', target: 'youtube-1' },
];

function ProducerCanvasComponent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onRunPipeline = useCallback(async () => {
    // TODO: Implement pipeline execution
    console.log('Running pipeline...', { nodes: nodes.length, edges: edges.length });
  }, [nodes, edges]);

  const routeForNodeType = useCallback((type?: string): string | null => {
    switch (type) {
      case 'sourceDoc': return '/canvas/source-ep1';
      case 'protagonist': return '/canvas/lore/protagonist';
      case 'backstory': return '/canvas/lore/backstory';
      case 'world': return '/canvas/lore/world';
      case 'prompt': return '/canvas/prompt-story';
      case 'writer': return '/canvas/writer-content';
      case 'imageGen': return '/canvas/image-gen';
      case 'tts': return '/canvas/tts-narration';
      case 'webtoonPanelGen': return '/canvas/webtoon-panel-gen';
      case 'webtoonLayout': return '/canvas/webtoon-layout';
      case 'webtoonExport': return '/canvas/webtoon-export';
      case 'videoGen': return '/canvas/video-gen';
      case 'render': return '/canvas/render-video';
      case 'exportWattpad': return '/canvas/export-wattpad';
      case 'publishYouTube': return '/canvas/publish-youtube';
      default: return null;
    }
  }, []);

  const onNodeClick = useCallback((_, node: RFNode<NodeData>) => {
    const href = routeForNodeType(node.type);
    if (href) window.location.assign(href);
  }, [routeForNodeType]);

  // Load saved canvas config via tRPC and apply to React Flow
  useEffect(() => {
    console.log('ProducerCanvasComponent mounted');
    console.log('Node types available:', Object.keys(nodeTypes));
    console.log('Initial nodes:', initialNodes.length);
    console.log('Initial edges:', initialEdges.length);
    console.log('React Flow version check');

    // Check if React Flow is working
    setTimeout(() => {
      console.log('DOM after mount:', document.querySelector('.react-flow__viewport'));
    }, 100);
    const client = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: '/api/trpc' })] });
    client.canvas.getCanvas.query()
      .then((cfg) => {
        if (!cfg) return;
        console.log('Hydrating canvas with server config');
        const computedNodes: RFNode<NodeData>[] = (cfg.nodes as { id?: string; type?: string; label?: string; data?: unknown }[]).map((n, idx) => ({
          id: n.id ?? String(idx + 1),
          type: n.type ?? 'sourceDoc',
          position: { x: 100 + (idx % 6) * 220, y: 60 + Math.floor(idx / 6) * 180 },
          data: {
            id: n.id ?? String(idx + 1),
            type: n.type ?? 'unknown',
            label: n.label ?? n.type ?? 'Node',
            status: 'idle',
            config: n.data ?? {},
          },
        }));
        const computedEdges: RFEdge[] = (cfg.edges as { id?: string; source: string; target: string }[]).map((e, i) => ({
          id: e.id ?? `e-${i}`,
          source: e.source,
          target: e.target,
        }));
        setNodes(computedNodes);
        setEdges(computedEdges);
      })
      .catch((err) => console.error('getCanvas error', err));
    // Listen for config save events to update node data in place
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent).detail as { nodeId: string; nodeType: string; config: Record<string, unknown> };
      const nodeTypeMap: Record<string, string> = {
        SourceDoc: 'sourceDoc',
        Protagonist: 'protagonist',
        Backstory: 'backstory',
        World: 'world',
        Prompt: 'prompt',
        Writer: 'writer',
        ImageGen: 'imageGen',
        WebtoonPanelGen: 'webtoonPanelGen',
        WebtoonLayout: 'webtoonLayout',
        WebtoonExport: 'webtoonExport',
        TTS: 'tts',
        VideoGen: 'videoGen',
        Render: 'render',
        ExportWattpad: 'exportWattpad',
        PublishYouTube: 'publishYouTube',
      };
      const canvasType = nodeTypeMap[detail.nodeType];
      if (!canvasType) return;
      setNodes((prev) => prev.map((n) => n.type === canvasType ? { ...n, data: { ...n.data, config: detail.config } } : n));
    };
    window.addEventListener('node-config-saved', onSaved);
    return () => window.removeEventListener('node-config-saved', onSaved);
  }, [setNodes, setEdges]);

  return (
    <div className="h-full w-full relative">
      {/* Debug info */}
      <div className="absolute top-2 left-2 bg-yellow-200 p-2 rounded text-xs z-50">
        Debug: React Flow loaded, nodes: {nodes.length}, edges: {edges.length}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background gap={12} size={1} />
      </ReactFlow>

      {/* Panel outside ReactFlow */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-gray-200 z-10">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Ghost Hacker Producer</h2>
        <p className="text-base text-gray-800 mb-3">
          Nodes: {nodes.length} | Edges: {edges.length}
        </p>
        <button
          onClick={onRunPipeline}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Run Pipeline
        </button>
      </div>
    </div>
  );
}

export default function ProducerCanvas() {
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    console.log('ProducerCanvas useEffect running - portal setup');

    // Load React Flow CSS from CDN
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://unpkg.com/@reactflow/core@11.11.4/dist/style.css';
    document.head.appendChild(linkElement);

    // Inject additional React Flow styles
    const styleElement = document.createElement('style');
    styleElement.textContent = reactFlowStyles;
    document.head.appendChild(styleElement);

    const el = document.querySelector('[data-canvas-container="react-flow"]') as HTMLElement | null;
    console.log('Container found for portal:', !!el, el?.className);
    setContainerEl(el);

    return () => {
      console.log('Cleaning up ProducerCanvas (styles only)');
      if (document.head.contains(linkElement)) {
        document.head.removeChild(linkElement);
      }
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  if (!containerEl) return null;
  return createPortal(<ProducerCanvasComponent />, containerEl);
}
