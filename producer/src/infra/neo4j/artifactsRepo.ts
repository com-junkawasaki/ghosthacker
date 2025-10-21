import { getNeo4jDriver } from './client';

export type ArtifactRecord = {
  id: string;
  nodeId: string;
  nodeType: string;
  label?: string;
  payloadJson: string; // Neo4j property must be primitive/array; store JSON string
  createdAt: string;
};

export async function saveArtifact(params: { nodeId: string; nodeType: string; label?: string; payload: Record<string, unknown> }) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const id = `${params.nodeId}:${Date.now()}`;
    const q = `
      MERGE (n:PipelineNode {id: $nodeId})
      ON CREATE SET n.type = $nodeType, n.label = coalesce($label, $nodeType), n.createdAt = datetime()
      SET n.updatedAt = datetime()
      CREATE (a:Artifact {id: $id, payloadJson: $payloadJson, createdAt: datetime()})
      MERGE (n)-[:PRODUCED]->(a)
      RETURN a
    `;
    const payloadJson = JSON.stringify(params.payload);
    await session.run(q, { id, nodeId: params.nodeId, nodeType: params.nodeType, label: params.label, payloadJson });
    return { id } satisfies { id: string };
  } finally {
    await session.close();
  }
}


