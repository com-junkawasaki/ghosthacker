"use server";

import { nodeSchemas, type NodeTypeKey } from "@/schemas/nodes";
import { safeParse } from "valibot";

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

  // TODO: Persist to storage (DB or file). For now, simulate success.
  // To comply with deterministic fault handling, do not throw.
  console.log("saveNodeConfig", params.nodeId, params.nodeType, result.output);
  return { ok: true as const, data: { nodeId: params.nodeId, nodeType: params.nodeType, config: result.output } };
}


