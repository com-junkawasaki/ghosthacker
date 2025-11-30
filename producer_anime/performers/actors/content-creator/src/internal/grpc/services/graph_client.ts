/**
 * Graph Service gRPC Client
 * GraphServiceのgRPCクライアント関数
 */

// ブラウザから直接gRPCを呼び出すことはできないため、
// Next.js API Route経由でgRPCを呼び出す

export interface GraphNode {
  id: string;
  label: string;
  properties: string; // JSON文字列
  vector: number[];
  jsonld: string; // JSON-LD文字列
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties: string; // JSON文字列
}

export interface VectorSearchResult {
  node_id: string;
  score: number;
  node?: GraphNode;
}

/**
 * グラフクエリを実行
 */
export async function graphQuery(query: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト
  
  try {
    const response = await fetch('/api/grpc/graph/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Graph query failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    // API Routeは { result: "..." } を返す（gRPC GraphQueryResponseのresultフィールド）
    const resultJson = data.result || data.resultJson || data.result_json;
    if (typeof resultJson === 'string' && resultJson.trim()) {
      try {
        return JSON.parse(resultJson);
      } catch (e) {
        // JSONパースに失敗した場合は文字列のまま返す
        return resultJson;
      }
    }
    return resultJson || data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Graph query took too long (10s)');
    }
    throw error;
  }
}

/**
 * グラフノードを取得
 */
export async function getGraphNode(id: string): Promise<GraphNode | null> {
  const response = await fetch(`/api/grpc/graph/node/${id}`, {
    method: 'GET',
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to get graph node: ${response.statusText}`);
  }
  const data = await response.json();
  return data.node || null;
}

/**
 * グラフノードを作成
 */
export async function createGraphNode(
  label: string,
  properties: Record<string, any>,
  jsonld: Record<string, any>,
  vector?: number[]
): Promise<string> {
  const response = await fetch('/api/grpc/graph/node', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label,
      properties: JSON.stringify(properties),
      jsonld: JSON.stringify(jsonld),
      vector: vector || [],
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create graph node: ${response.statusText}`);
  }
  const data = await response.json();
  return data.id;
}

/**
 * セマンティック検索を実行
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<VectorSearchResult[]> {
  const response = await fetch('/api/grpc/graph/search/semantic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Semantic search failed: ${response.statusText}`);
  }
  const data = await response.json();
  // gRPCレスポンスは { results: [...] } 形式
  return (data.results || []).map((r: any) => ({
    node_id: r.node_id || r.nodeId || '',
    score: r.score || 0,
    label: r.label || '',
    properties: r.properties || '',
  }));
}

/**
 * ベクトル検索を実行
 */
export async function vectorSearch(
  queryVector: number[],
  limit: number = 10
): Promise<VectorSearchResult[]> {
  const response = await fetch('/api/grpc/graph/search/vector', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_vector: queryVector, limit }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Vector search failed: ${response.statusText}`);
  }
  const data = await response.json();
  // gRPCレスポンスは { results: [...] } 形式
  return (data.results || []).map((r: any) => ({
    node_id: r.node_id || r.nodeId || '',
    score: r.score || 0,
    label: r.label || '',
    properties: r.properties || '',
  }));
}

/**
 * JSON-LDを検証
 */
export async function validateJsonLd(jsonld: Record<string, any>): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch('/api/grpc/graph/jsonld/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonld: JSON.stringify(jsonld) }),
  });
  if (!response.ok) {
    throw new Error(`JSON-LD validation failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * JSON-LDをインポート
 */
export async function importJsonLd(jsonld: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  const response = await fetch('/api/grpc/graph/jsonld/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonld: JSON.stringify(jsonld) }),
  });
  if (!response.ok) {
    throw new Error(`JSON-LD import failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * JSON-LDをエクスポート
 */
export async function exportJsonLd(projectId?: string): Promise<Record<string, any>> {
  const params = projectId ? `?project_id=${projectId}` : '';
  const response = await fetch(`/api/grpc/graph/jsonld/export${params}`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`JSON-LD export failed: ${response.statusText}`);
  }
  const data = await response.json();
  return JSON.parse(data.jsonld);
}

/**
 * グラフエッジを作成
 */
export async function createGraphEdge(
  source: string,
  target: string,
  label: string,
  properties?: Record<string, any>
): Promise<string> {
  const response = await fetch('/api/grpc/graph/edge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      target,
      label,
      properties: properties ? JSON.stringify(properties) : '{}',
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create graph edge: ${response.statusText}`);
  }
  const data = await response.json();
  return data.id;
}

/**
 * グラフエッジを削除
 */
export async function deleteGraphEdge(edgeId: string): Promise<boolean> {
  const response = await fetch(`/api/grpc/graph/edge/${edgeId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete graph edge: ${response.statusText}`);
  }
  const data = await response.json();
  return data.success === true;
}

/**
 * グラフノードを更新
 */
export async function updateGraphNode(
  id: string,
  label: string,
  properties: Record<string, any>,
  jsonld: Record<string, any>,
  vector?: number[]
): Promise<void> {
  const response = await fetch(`/api/grpc/graph/node/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      label,
      properties: JSON.stringify(properties),
      jsonld: JSON.stringify(jsonld),
      vector: vector || [],
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update graph node: ${response.statusText}`);
  }
}

