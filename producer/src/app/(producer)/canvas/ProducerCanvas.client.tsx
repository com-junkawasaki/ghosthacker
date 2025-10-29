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
import { createActor, createMachine } from 'xstate';
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

// XState machine for Producer Canvas
interface ProducerCanvasContext {
  nodes: RFNode<NodeData>[];
  edges: RFEdge[];
  runStatus: 'idle' | 'running' | 'success' | 'error';
  error: string | null;
}

type ProducerCanvasEvent =
  | { type: 'GRAPH_LOADED'; nodes: RFNode<NodeData>[]; edges: RFEdge[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'RUN_PIPELINE' }
  | { type: 'UPDATE_NODES'; nodes: RFNode<NodeData>[] }
  | { type: 'UPDATE_EDGES'; edges: RFEdge[] }
  | { type: 'RUN_SUCCESS' }
  | { type: 'RUN_ERROR'; error: string }
  | { type: 'RESET' }
  | { type: 'RETRY' };

const producerCanvasMachine = createMachine({
  id: 'producerCanvas',
  initial: 'loading',
  context: {
    nodes: [],
    edges: [],
    runStatus: 'idle',
    error: null,
  },
  states: {
    loading: {
      on: {
        GRAPH_LOADED: {
          target: 'idle',
          actions: 'setGraphData',
        },
        LOAD_ERROR: {
          target: 'error',
          actions: 'setError',
        },
      },
    },
    idle: {
      on: {
        RUN_PIPELINE: 'running',
        UPDATE_NODES: {
          actions: 'updateNodes',
        },
        UPDATE_EDGES: {
          actions: 'updateEdges',
        },
      },
    },
    running: {
      on: {
        RUN_SUCCESS: 'success',
        RUN_ERROR: {
          target: 'error',
          actions: 'setError',
        },
      },
    },
    success: {
      after: {
        2500: 'idle',
      },
      on: {
        RESET: 'idle',
      },
    },
    error: {
      on: {
        RETRY: 'idle',
        RESET: 'idle',
      },
    },
  },
}, {
  actions: {
    setGraphData: (context: any, event: any) => {
      if (event?.type === 'GRAPH_LOADED') {
        context.nodes = event.nodes;
        context.edges = event.edges;
      }
    },
    updateNodes: (context: any, event: any) => {
      if (event?.type === 'UPDATE_NODES') {
        context.nodes = event.nodes;
      }
    },
    updateEdges: (context: any, event: any) => {
      if (event?.type === 'UPDATE_EDGES') {
        context.edges = event.edges;
      }
    },
    setError: (context: any, event: any) => {
      if (event?.type === 'LOAD_ERROR' || event?.type === 'RUN_ERROR') {
        context.error = event.error;
        context.runStatus = 'error';
      }
    },
  },
});

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

  // XState actor for producer canvas state management
  const [producerActor] = useState(() => createActor(producerCanvasMachine).start());
  const [actorState, setActorState] = useState(producerActor.getSnapshot());

  // Subscribe to actor state changes
  useEffect(() => {
    const subscription = producerActor.subscribe(setActorState);
    return () => subscription.unsubscribe();
  }, [producerActor]);

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

      // Send graph loaded event to actor
      producerActor.send({
        type: 'GRAPH_LOADED',
        nodes: rfNodes,
        edges: rfEdges,
      });
    }
  }, [storyGraphQuery.data, setNodes, setEdges, producerActor]);

  useEffect(() => {
    if (storyGraphQuery.isError) {
      producerActor.send({
        type: 'LOAD_ERROR',
        error: storyGraphQuery.error?.message || 'Failed to load graph',
      });
    }
  }, [storyGraphQuery.isError, storyGraphQuery.error, producerActor]);


  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const runPipelineMutation = api.pipeline.run.useMutation();

  const onRunPipeline = useCallback(async () => {
    // Prevent pipeline execution from Canvas - use Story Pipeline page instead
    alert('パイプライン実行は /canvas/story ページから行ってください。このページはグラフ可視化専用です。');
    return;

    // Send run pipeline event to actor
    producerActor.send({ type: 'RUN_PIPELINE' });

    try {
      await runPipelineMutation.mutateAsync();
      await storyGraphQuery.refetch();
      producerActor.send({ type: 'RUN_SUCCESS' });
    } catch (err: any) {
      console.error('pipeline.run error', err);
      producerActor.send({
        type: 'RUN_ERROR',
        error: err instanceof Error ? err.message : 'Pipeline execution failed',
      });
    }
  }, [runPipelineMutation, storyGraphQuery, producerActor]);

  const onNodeClick = useCallback((_evt: unknown, node: RFNode<NodeData>) => {
    // Navigation logic can be re-implemented if Neided
    console.log('Node clicked:', node);
  }, []);

  if (actorState.matches('loading') || storyGraphQuery.isLoading) {
    return <div>Loading story...</div>;
  }

  if (actorState.matches('error') && !storyGraphQuery.data) {
    return <div>Error loading story: {actorState.context.error}</div>
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
          disabled={actorState.matches('running') || actorState.matches('loading')}
        >
          {actorState.matches('running') ? 'Running...' : 'Run Pipeline'}
        </button>
        {!actorState.matches('idle') && !actorState.matches('loading') && (
          <div className="mt-3 text-sm">
            {actorState.matches('running') && <span className="text-blue-700">Running...</span>}
            {actorState.matches('success') && <span className="text-green-700">Completed</span>}
            {actorState.matches('error') && <span className="text-red-700">Failed: {actorState.context.error}</span>}
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
