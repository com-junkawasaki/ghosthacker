/**
 * Graph Visualization Component
 * グラフ可視化コンポーネント
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { graphQuery } from '@/internal/grpc/services/graph_client';

interface GraphVisualizationProps {
  projectId: string;
}

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export default function GraphVisualization({ projectId }: GraphVisualizationProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadGraphData();
  }, [projectId]);

  const loadGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      // gRPC API Route経由でグラフクエリを実行
      const query = 'MATCH (n) RETURN n LIMIT 100';
      const result = await graphQuery(query);
      
      // 結果のパース処理（PostgreSQLクエリ結果からノードとエッジを抽出）
      // 実際の実装では、クエリ結果の構造に応じて処理
      const parsedNodes: GraphNode[] = [];
      const parsedEdges: GraphEdge[] = [];
      
      if (Array.isArray(result)) {
        result.forEach((row: any) => {
          if (row.n) {
            const nodeData = row.n;
            parsedNodes.push({
              id: nodeData.id || '',
              label: nodeData.label || '',
              properties: typeof nodeData.properties === 'string' 
                ? JSON.parse(nodeData.properties) 
                : nodeData.properties || {},
            });
          }
        });
      }
      
      setNodes(parsedNodes);
      setEdges(parsedEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

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
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        <canvas
          ref={canvasRef}
          className="w-full h-96 border border-gray-300 dark:border-gray-600 rounded"
        />
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Nodes: {nodes.length} | Edges: {edges.length}
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Note: Full graph visualization will be implemented with react-force-graph or vis.js
      </div>
    </div>
  );
}

