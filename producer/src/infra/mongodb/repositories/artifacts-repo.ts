import { getMongoDb } from '../client';

const COLLECTION_NAME = 'pipeline_artifacts';

export type ArtifactRecord = {
  id: string;
  nodeId: string;
  nodeType: string;
  label?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

/**
 * Artifacts repository for MongoDB
 * Migrated from Neo4j
 */
export async function saveArtifact(params: {
  nodeId: string;
  nodeType: string;
  label?: string;
  payload: Record<string, unknown>;
}): Promise<{ id: string }> {
  const db = await getMongoDb();
  const collection = db.collection<ArtifactRecord>(COLLECTION_NAME);
  const now = new Date();
  const id = `${params.nodeId}:${Date.now()}`;

  const doc: ArtifactRecord = {
    id,
    nodeId: params.nodeId,
    nodeType: params.nodeType,
    label: params.label,
    payload: params.payload,
    createdAt: now,
  };

  await collection.insertOne(doc);
  return { id };
}

