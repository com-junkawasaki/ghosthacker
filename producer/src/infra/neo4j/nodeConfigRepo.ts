import { getNeo4jDriver } from './client';
import * as Cypher from '@neo4j/cypher-builder';

// Merkle DAG: Node config persistence in Neo4j
export async function upsertNodeConfig(params: { nodeId: string; nodeType: string; label: string; config: Record<string, unknown> }) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const node = new Cypher.Node();
    // Using Raw clause for simplicity with current builder version
    const query = new Cypher.Raw((ctx) => {
      const n = ctx.compile(node);
      const props = {
        id: new Cypher.Param(params.nodeId),
        type: new Cypher.Param(params.nodeType),
        label: new Cypher.Param(params.label),
        configJson: new Cypher.Param(JSON.stringify(params.config)),
        updatedAt: Cypher.datetime(),
      } as const;
      const setMap = ctx.compile(new Cypher.Map(props));
      const labelStr = ':PipelineNode';
      return `MERGE (${n}${labelStr} { id: $param0 }) SET ${n} = ${setMap} RETURN ${n} AS n`;
    });

    const res = await session.run(query.build().cypher, query.build().params);
    return res.records.length > 0;
  } finally {
    await session.close();
  }
}

export async function getNodeConfig(nodeId: string): Promise<{ nodeId: string; nodeType: string; label: string; config: Record<string, unknown> } | null> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    const node = new Cypher.Node();
    const query = new Cypher.Match(new Cypher.Pattern(node, {labels: ["PipelineNode"], properties: { id: new Cypher.Param(nodeId) }}))
        .return([node, 'n']);

    const { cypher, params } = query.build();
    const res = await session.run(cypher, params);
    const rec = res.records[0];
    if (!rec) return null;

    const n = rec.get("n").properties;
    let config: Record<string, unknown> = {};
    try {
      if (n.configJson) config = JSON.parse(n.configJson as string) as Record<string, unknown>;
    } catch {
      config = {};
    }
    return {
      nodeId: n.id as string,
      nodeType: n.type as string,
      label: n.label as string,
      config,
    };
  } finally {
    await session.close();
  }
}


