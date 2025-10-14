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

import 'reactflow/dist/style.css';

import {
  SourceDocNode,
  PromptNode,
  WriterNode,
  ImageGenNode,
  VideoGenNode,
  TTSNode,
  RenderNode,
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
    position: { x: 1300, y: 50 },
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
    position: { x: 1300, y: 150 },
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
    console.log('Running pipeline...');
  }, []);

  return (
    <>
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
        <button
          onClick={onRunPipeline}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Pipeline
        </button>
      </div>
    </>
  );
}

export default function ProducerCanvas() {
  useEffect(() => {
    const container = document.getElementById('react-flow-container');
    if (container) {
      const root = createRoot(container);
      root.render(<ProducerCanvasComponent />);
      return () => root.unmount();
    }
  }, []);

  return null;
}
