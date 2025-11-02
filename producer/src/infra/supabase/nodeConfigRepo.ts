/**
 * @context https://schema.org/SoftwareApplication
 * @type {gh:NodeConfigRepository}
 * Merkle DAG: node-config-repo -> drizzle-orm -> postgres -> supabase
 * Node config persistence in Supabase PostgreSQL
 */
import { db } from './db';
import { pipelineNodes } from './schema';
import { eq } from 'drizzle-orm';

export async function upsertNodeConfig(params: {
  nodeId: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
}) {
  const now = new Date();

  await db
    .insert(pipelineNodes)
    .values({
      id: params.nodeId,
      nodeType: params.nodeType,
      label: params.label,
      configJson: params.config,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pipelineNodes.id,
      set: {
        nodeType: params.nodeType,
        label: params.label,
        configJson: params.config,
        updatedAt: now,
      },
    });

  return true;
}

export async function getNodeConfig(nodeId: string): Promise<{
  nodeId: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
} | null> {
  const [node] = await db
    .select()
    .from(pipelineNodes)
    .where(eq(pipelineNodes.id, nodeId))
    .limit(1);

  if (!node) return null;

  return {
    nodeId: node.id,
    nodeType: node.nodeType,
    label: node.label,
    config: node.configJson,
  };
}

