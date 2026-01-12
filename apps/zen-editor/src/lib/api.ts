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
};

let _client: EditorClient | null = null;

function initClient(): void {
  if (_client) return;
  
  try {
    console.log("[api] Starting client initialization...");
    const transport = createConnectTransport({
      baseUrl: "http://localhost:8080",
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
 * 同期的アクセス（初期化前は null）
 */
export function getClientSync(): any {
  return _client;
}
