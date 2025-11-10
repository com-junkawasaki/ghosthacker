"use server";

import { nodeSchemas, type NodeTypeKey } from "@/schemas/nodes";
import { safeParse } from "valibot";
import { writeJsonLd, readJsonLd } from "@/server/lib/jsonld-storage";

// Merkle DAG: Server action to persist node config to file system
export async function saveNodeConfig(params: {
  nodeId: string;
  nodeType: NodeTypeKey;
  config: unknown;
}) {
  const schema = nodeSchemas[params.nodeType];
  const result = safeParse(schema, params.config);
  if (!result.success) {
    return { ok: false, fault: { type: "ValidationError", issues: result.issues } } as const;
  }

  // Storage boundary: persist config to file, but never throw
  try {
    const nodeConfigJsonLd = {
      '@context': {
        '@base': 'https://ghosthacker.gftd.co.jp/',
        '@vocab': 'https://ghosthacker.gftd.co.jp/ontology#',
        'gh': 'https://ghosthacker.gftd.co.jp/ontology#',
      },
      '@id': `node-config:${params.nodeId}`,
      '@type': 'gh:NodeConfig',
      'gh:nodeId': params.nodeId,
      'gh:nodeType': params.nodeType,
      'gh:label': params.nodeId,
      'gh:config': result.output as Record<string, unknown>,
      'prov:generatedAtTime': new Date().toISOString(),
    };

    // ファイル名は nodeId を使用（拡張子は自動追加）
    writeJsonLd('canvas', `node-configs/${params.nodeId}`, nodeConfigJsonLd);
    return { ok: true as const, data: { nodeId: params.nodeId, nodeType: params.nodeType, config: result.output } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save node config to file:', errorMessage);
    return { ok: false as const, fault: { type: "StorageUnavailable", message: errorMessage } };
  }
}

export async function loadNodeConfig(params: { nodeId: string; nodeType: NodeTypeKey; fallback: Record<string, unknown> }) {
  // Storage boundary: read config from file, fallback on any failure
  try {
    const nodeConfigJsonLd = readJsonLd<{
      '@id': string;
      '@type': string;
      'gh:nodeId': string;
      'gh:nodeType': string;
      'gh:config': Record<string, unknown>;
    }>('canvas', `node-configs/${params.nodeId}`);
    
    if (!nodeConfigJsonLd) {
      return { config: params.fallback } as const;
    }
    
    if (nodeConfigJsonLd['gh:nodeType'] !== params.nodeType) {
      return { config: params.fallback } as const;
    }
    
    return { config: nodeConfigJsonLd['gh:config'] } as const;
  } catch (error) {
    console.error('Failed to load node config from file:', error);
    return { config: params.fallback } as const;
  }
}


