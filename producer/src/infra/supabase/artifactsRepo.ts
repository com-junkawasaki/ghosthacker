/**
 * @context https://schema.org/SoftwareApplication
 * @type {gh:ArtifactsRepository}
 * Merkle DAG: artifacts-repo -> drizzle-orm -> postgres -> supabase
 * Artifacts persistence in Supabase PostgreSQL
 */
import { db } from './db';
import { artifacts, pipelineNodes } from './schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export type ArtifactRecord = {
  id: string;
  nodeId: string;
  nodeType: string;
  label?: string;
  payloadJson: string; // JSON string for compatibility
  createdAt: string;
};

export async function saveArtifact(params: {
  nodeId: string;
  nodeType: string;
  label?: string;
  payload: Record<string, unknown>;
}) {
  const id = randomUUID();
  const now = new Date();

  // Ensure pipeline node exists
  await db
    .insert(pipelineNodes)
    .values({
      id: params.nodeId,
      nodeType: params.nodeType,
      label: params.label ?? params.nodeType,
      configJson: {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pipelineNodes.id,
      set: {
        nodeType: params.nodeType,
        label: params.label ?? params.nodeType,
        updatedAt: now,
      },
    });

  // Insert artifact
  await db.insert(artifacts).values({
    id,
    nodeId: params.nodeId,
    nodeType: params.nodeType,
    label: params.label ?? null,
    payloadJson: params.payload,
    createdAt: now,
  });

  return { id };
}

