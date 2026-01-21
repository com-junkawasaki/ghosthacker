import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { EditorService } from "./gen/editor_pb";

// 型定義
type EditorClient = {
  getTopology: (req: { projectId: string }) => Promise<any>;
  getBlocks: (req: { projectId: string, manuscriptId: string }) => Promise<any>;
  saveManuscript: (req: { projectId: string, manuscriptId: string, blocks: any[] }) => Promise<any>;
  getProjectMetadata: (req: { projectId: string }) => Promise<any>;
  callTool: (req: any) => Promise<any>;
  interact: (req: any) => AsyncIterable<any>;
  saveStoryboard: (req: { projectId: string, scenes: any[] }) => Promise<any>;
  getStoryboard: (req: { projectId: string }) => Promise<any>;
  commitHistory: (req: { projectId: string, type: string, stateJson: string, message: string, branchName: string, parentId?: string }) => Promise<any>;
  getHistory: (req: { projectId: string, branchName?: string }) => Promise<any>;
  checkoutHistory: (req: { historyId: string }) => Promise<any>;
  saveNode: (req: { projectId: string, node: any }) => Promise<any>;
  openFile: (req: { path: string }) => Promise<any>;
  saveFile: (req: { path: string, content: string }) => Promise<any>;
};

let _client: EditorClient | null = null;

function initClient(): void {
  if (_client) return;
  
  try {
    console.log("[api] Starting client initialization...");
    const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";
    console.log(`[api] Initializing transport with baseUrl: ${baseUrl}`);
    
    // Simple health check
    fetch(`${baseUrl}/health`).then(r => r.text()).then(t => console.log(`[api] Backend health: ${t}`)).catch(e => console.error(`[api] Backend unreachable:`, e));

    const transport = createConnectTransport({
      baseUrl: baseUrl,
    });
    
    console.log("[api] Transport created. EditorService:", !!EditorService);
    
    // @ts-ignore
    _client = createClient(EditorService, transport);
    
    if (_client) {
      console.log("[api] Client created successfully. Available methods:", Object.keys(_client));
    } else {
      console.error("[api] createClient returned null");
    }
  } catch (err) {
    console.error("[api] Failed to initialize client:", err);
  }
}

// 即時初期化
initClient();

/**
 * クライアントを取得
 */
export async function getClient(): Promise<EditorClient | null> {
  if (!_client) {
    initClient();
  }
  return _client;
}

/**
 * アセットのURLを取得
 */
export function getAssetUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  // Remove trailing slash if exists
  const base = baseUrl.replace(/\/$/, "");
  // Ensure path starts with slash
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * 同期的アクセス（初期化前は null）
 */
export function getClientSync(): any {
  return _client;
}
