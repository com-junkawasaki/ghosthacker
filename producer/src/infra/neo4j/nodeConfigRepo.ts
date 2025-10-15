import { getNeo4jDriver } from './client';
import * as Cypher from '@neo4j/cypher-builder';

// Merkle DAG: Node config persistence in Neo4j
export async function upsertNodeConfig(params: { nodeId: string; nodeType: string; label: string; config: Record<string, unknown> }) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const node = new Cypher.Node('n', 'PipelineNode');
    const query = new Cypher.Query()
      .merge(new Cypher.Pattern(node, { id: new Cypher.Param(params.nodeId) }))
      .set([[
        node,
        {
          id: new Cypher.Param(params.nodeId),
          type: new Cypher.Param(params.nodeType),
          label: new Cypher.Param(params.label),
          config: new Cypher.Param(params.config),
          updatedAt: Cypher.datetime(),
        },
      ]])
      .return(node)
      .build();

    const res = await session.run(query.cypher, query.params);
    return res.records.length > 0;
  } finally {
    await session.close();
  }
}

export async function getNodeConfig(nodeId: string): Promise<{ nodeId: string; nodeType: string; label: string; config: Record<string, unknown> } | null> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const node = new Cypher.Node('n', 'PipelineNode');
    const query = new Cypher.Query()
      .match(new Cypher.Pattern(node).withProperties({ id: new Cypher.Param(nodeId) }))
      .return(node)
      .build();
    const res = await session.run(query.cypher, query.params);
    const rec = res.records[0];
    if (!rec) return null;
    const n = rec.get('n') as { properties: { id: string; type: string; label: string; config?: Record<string, unknown> } };
    return {
      nodeId: n.properties.id,
      nodeType: n.properties.type,
      label: n.properties.label,
      config: n.properties.config ?? {},
    };
  } finally {
    await session.close();
  }
}


