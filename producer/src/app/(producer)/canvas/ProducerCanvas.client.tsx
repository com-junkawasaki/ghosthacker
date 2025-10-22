'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReactFlow, addEdge, useNodesState, useEdgesState } from '@reactflow/core';
import type { Node as RFNode, Edge as RFEdge, Connection } from '@reactflow/core';
import { Controls } from '@reactflow/controls';
import { Background } from '@reactflow/background';
import { httpBatchLink, createTRPCReact } from '@trpc/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers';
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

interface GraphNode {
  id: string;
  labels: string[];
  name?: string;
  title?: string;
  [key: string]: unknown;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

const api = createTRPCReact<AppRouter>();

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

function ProducerCanvasComponent() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const storyGraphQuery = api.canvas.getStoryGraph.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (storyGraphQuery.data) {
      const { nodes: graphNodes, edges: graphEdges } = storyGraphQuery.data;

      const rfNodes: RFNode<NodeData>[] = (graphNodes as unknown as GraphNode[]).map((n, idx) => ({
        id: n.id.toString(),
        type: n.labels[0], // Assuming the first label is the node type
        position: { x: 100 + (idx % 8) * 250, y: 100 + Math.floor(idx / 8) * 180 },
        data: {
          id: n.id.toString(),
          type: n.labels[0],
          label: n.name || n.title || n.labels[0],
          status: 'idle',
          config: n as Record<string, string | number | boolean | null>,
        },
      }));

      const rfEdges: RFEdge[] = (graphEdges as unknown as GraphEdge[]).map(e => ({
        id: e.id.toString(),
        source: e.source.toString(),
        target: e.target.toString(),
        label: e.type,
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    }
  }, [storyGraphQuery.data, setNodes, setEdges]);


  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const runPipelineMutation = api.pipeline.run.useMutation();

  const onRunPipeline = useCallback(async () => {
    // Prevent pipeline execution from Canvas - use Story Pipeline page instead
    alert('パイプライン実行は /canvas/story ページから行ってください。このページはグラフ可視化専用です。');
    return;

    setRunStatus('running');
    try {
      await runPipelineMutation.mutateAsync({ nodes, edges });
      await storyGraphQuery.refetch();
      setRunStatus('success');
    } catch (err) {
      console.error('pipeline.run error', err);
      setRunStatus('error');
    } finally {
      setTimeout(() => setRunStatus('idle'), 2500);
    }
  }, [nodes, edges, runPipelineMutation, storyGraphQuery]);

  const onNodeClick = useCallback((_evt: unknown, node: RFNode<NodeData>) => {
    // Navigation logic can be re-implemented if Neided
    console.log('Node clicked:', node);
  }, []);

  if (storyGraphQuery.isLoading) {
    return <div>Loading story...</div>;
  }

  if (storyGraphQuery.isError) {
    return <div>Error loading story: {storyGraphQuery.error.message}</div>
  }

  return (
    <div className="h-full w-full relative">
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

      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-gray-200 z-10">
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Ghost Hacker Producer</h2>
        <p className="text-base text-gray-800 mb-3">
          Nodes: {nodes.length} | Edges: {edges.length}
        </p>
        <button
          onClick={onRunPipeline}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={runStatus === 'running'}
        >
          {runStatus === 'running' ? 'Running...' : 'Run Pipeline'}
        </button>
        {runStatus !== 'idle' && (
          <div className="mt-3 text-sm">
            {runStatus === 'running' && <span className="text-blue-700">Running...</span>}
            {runStatus === 'success' && <span className="text-green-700">Completed</span>}
            {runStatus === 'error' && <span className="text-red-700">Failed</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProducerCanvas() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ProducerCanvasComponent />
      </QueryClientProvider>
    </api.Provider>
  );
}
