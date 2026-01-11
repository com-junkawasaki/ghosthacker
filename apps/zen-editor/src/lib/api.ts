import { EditorService } from "./gen/editor_pb";

// 型定義
type EditorClient = {
  getTopology: (req: { projectId: string }) => Promise<any>;
  getProjectMetadata: (req: { projectId: string }) => Promise<any>;
  callTool: (req: any) => Promise<any>;
  interact: (req: any) => AsyncIterable<any>;
  saveStoryboard: (req: { projectId: string, scenes: any[] }) => Promise<any>;
  getStoryboard: (req: { projectId: string }) => Promise<any>;
  commitHistory: (req: { projectId: string, type: string, stateJson: string, message: string, branchName: string, parentId?: string }) => Promise<any>;
  getHistory: (req: { projectId: string, branchName?: string }) => Promise<any>;
  checkoutHistory: (req: { historyId: string }) => Promise<any>;
};

let _client: EditorClient | null = null;
let _initPromise: Promise<void> | null = null;

async function initClient(): Promise<void> {
  if (_client) return;
  
  try {
    console.log("[api] Starting client initialization...");
    const { createConnectTransport } = await import("@connectrpc/connect-web");
    const { createClient } = await import("@connectrpc/connect");
    
    const transport = createConnectTransport({
      baseUrl: "http://localhost:8080",
    });
    
    console.log("[api] EditorService methods:", Object.keys(EditorService.methods));
    
    // @ts-ignore
    _client = createClient(EditorService, transport);
    console.log("[api] Client initialized successfully");
  } catch (err) {
    console.error("[api] Failed to initialize client:", err);
  }
}

// 即時初期化開始
_initPromise = initClient();

/**
 * クライアントを取得（初期化完了を待つ）
 */
export async function getClient(): Promise<EditorClient | null> {
  if (!_client) {
    await _initPromise;
  }
  return _client;
}

/**
 * 同期的アクセス（初期化前は null）
 */
export function getClientSync(): any {
  return _client;
}
