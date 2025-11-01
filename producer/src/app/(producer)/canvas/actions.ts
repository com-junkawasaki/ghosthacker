"use server";

import { nodeSchemas, type NodeTypeKey } from "@/schemas/nodes";
import { safeParse } from "valibot";
import { upsertNodeConfig, getNodeConfig } from "@/infra/mongodb/repositories/node-config-repo";

// Merkle DAG: Server action to persist node config
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

  // Storage boundary: persist config, but never throw
  try {
    await upsertNodeConfig({ nodeId: params.nodeId, nodeType: params.nodeType, label: params.nodeId, config: result.output as Record<string, unknown> });
    return { ok: true as const, data: { nodeId: params.nodeId, nodeType: params.nodeType, config: result.output } };
  } catch {
    return { ok: false as const, fault: { type: "StorageUnavailable", message: "MongoDB is not reachable" } };
  }
}

export async function loadNodeConfig(params: { nodeId: string; nodeType: NodeTypeKey; fallback: Record<string, unknown> }) {
  // Storage boundary: read config, fallback on any failure
  try {
    const stored = await getNodeConfig(params.nodeId);
    if (!stored) return { config: params.fallback } as const;
    if (stored.nodeType !== params.nodeType) return { config: params.fallback } as const;
    return { config: stored.config } as const;
  } catch {
    return { config: params.fallback } as const;
  }
}


