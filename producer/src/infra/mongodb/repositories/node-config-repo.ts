import { getMongoDb } from '../client';

const COLLECTION_NAME = 'pipeline_nodes';

/**
 * Node config repository for MongoDB
 * Migrated from Neo4j
 */
export async function upsertNodeConfig(params: {
  nodeId: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
}): Promise<boolean> {
  const db = await getMongoDb();
  const collection = db.collection(COLLECTION_NAME);
  const now = new Date();

  await collection.updateOne(
    { id: params.nodeId },
    {
      $set: {
        id: params.nodeId,
        type: params.nodeType,
        label: params.label,
        config: params.config,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return true;
}

export async function getNodeConfig(
  nodeId: string
): Promise<{ nodeId: string; nodeType: string; label: string; config: Record<string, unknown> } | null> {
  const db = await getMongoDb();
  const collection = db.collection(COLLECTION_NAME);
  const doc = await collection.findOne({ id: nodeId });

  if (!doc) return null;

  return {
    nodeId: doc.id as string,
    nodeType: doc.type as string,
    label: doc.label as string,
    config: (doc.config as Record<string, unknown>) || {},
  };
}

