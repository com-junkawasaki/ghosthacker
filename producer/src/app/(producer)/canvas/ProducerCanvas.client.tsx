'use client';

import React, { useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ReactFlow,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Node as FlowNode,
} from '@reactflow/core';
import { Controls } from '@reactflow/controls';
import { Background } from '@reactflow/background';

// Additional styles for React Flow (injected via globals.css)
const reactFlowStyles = `
  .react-flow__node {
    min-width: 150px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px;
  }
  .react-flow__node.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px #3b82f6;
  }
  .react-flow__edge-path {
    stroke: #6b7280;
    stroke-width: 2;
  }
  .react-flow__controls {
    bottom: 20px;
    left: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
  .react-flow__viewport {
    background: #f9fafb;
  }
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
  NodeData,
} from '@/pipeline/node-types';

// Define node types for React Flow
const nodeTypes: NodeTypes = {
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
};

// Initial nodes for the pipeline
const initialNodes: FlowNode<NodeData>[] = [
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
const initialEdges: Edge[] = [
  { id: 'source-to-prompt', source: 'source-1', target: 'prompt-1' },
  { id: 'prompt-to-writer', source: 'prompt-1', target: 'writer-1' },
  { id: 'writer-to-image', source: 'writer-1', target: 'image-gen-1' },
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
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onRunPipeline = useCallback(async () => {
    // TODO: Implement pipeline execution
    console.log('Running pipeline...', { nodes: nodes.length, edges: edges.length });
  }, [nodes, edges]);

  // Debug logging
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
  }, []);

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
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background gap={12} size={1} />
      </ReactFlow>

      {/* Panel outside ReactFlow */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-10">
        <h2 className="text-lg font-semibold mb-2">Ghost Hacker Producer</h2>
        <p className="text-sm text-gray-600 mb-2">
          Nodes: {nodes.length} | Edges: {edges.length}
        </p>
        <button
          onClick={onRunPipeline}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Pipeline
        </button>
      </div>
    </div>
  );
}

export default function ProducerCanvas() {
  useEffect(() => {
    console.log('ProducerCanvas useEffect running - STEP 2');

    // Load React Flow CSS from CDN
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://unpkg.com/@reactflow/core@11.11.4/dist/style.css';
    document.head.appendChild(linkElement);

    // Inject additional React Flow styles
    const styleElement = document.createElement('style');
    styleElement.textContent = reactFlowStyles;
    document.head.appendChild(styleElement);

    // Function to mount the component
    const mountComponent = () => {
      const container = document.querySelector('[data-canvas-container="react-flow"]') as HTMLElement | null;
      console.log('Container found:', !!container, container?.className);

      if (container) {
        console.log('Mounting React Flow component');
        try {
          // Clear any existing content
          container.innerHTML = '';

          // Add a test element first
          const testDiv = document.createElement('div');
          testDiv.textContent = 'React Flow Loading...';
          testDiv.style.cssText = 'position: absolute; top: 10px; right: 10px; background: blue; color: white; padding: 5px; z-index: 1000;';
          container.appendChild(testDiv);

          const root = createRoot(container);
          root.render(<ProducerCanvasComponent />);
          console.log('React Flow component mounted successfully');

          return () => {
            console.log('Unmounting React Flow component');
            root.unmount();
            if (document.head.contains(linkElement)) {
              document.head.removeChild(linkElement);
            }
            if (document.head.contains(styleElement)) {
              document.head.removeChild(styleElement);
            }
          };
        } catch (error) {
          console.error('Error mounting React Flow component:', error);
          // Fallback to simple test
          const testDiv = document.createElement('div');
          testDiv.textContent = 'React Flow Error - Using Fallback';
          testDiv.style.cssText = 'position: absolute; top: 50px; left: 50px; background: red; color: white; padding: 10px; z-index: 1000; font-size: 18px;';
          container.appendChild(testDiv);
          
          if (document.head.contains(linkElement)) {
            document.head.removeChild(linkElement);
          }
          if (document.head.contains(styleElement)) {
            document.head.removeChild(styleElement);
          }
        }
      }
      return null;
    };

    // Try to mount immediately
    let cleanup = mountComponent();

    // Also try mounting after a short delay in case the DOM isn't ready yet
    if (!cleanup) {
      console.log('Scheduling delayed mount');
      const timeoutId = setTimeout(() => {
        cleanup = mountComponent();
        if (!cleanup) {
          console.error('Failed to mount component after delay');
        }
      }, 100);

      return () => {
        console.log('Cleaning up ProducerCanvas');
        clearTimeout(timeoutId);
        if (cleanup) cleanup();
        if (document.head.contains(linkElement)) {
          document.head.removeChild(linkElement);
        }
        if (document.head.contains(styleElement)) {
          document.head.removeChild(styleElement);
        }
      };
    }

    return cleanup;
  }, []);

  return null;
}
