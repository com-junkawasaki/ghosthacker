import fs from 'node:fs';
import path from 'node:path';
import { getNeo4jDriver } from '../infra/neo4j/client';
import {
  CharacterSchema,
  ProjectSchema,
  EpisodeSchema,
  SceneSchema,
  SettingSchema,
} from '../ontology/schema';
import { Value } from '@sinclair/typebox/value';

const GHOSTHACKER_ONTOLOGY_PREFIX = 'gh';
const SCHEMA_ORG_PREFIX = 'schema';

// Helper to extract value from Neo4j property format
function extractValue(value: any): any {
    if (Array.isArray(value) && value.length > 0) {
        return value[0].value;
    }
    return undefined;
}


async function main() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    console.log('Starting lore import...');

    const jsonlPath = path.resolve(process.cwd(), '..', '250806', 'gftd.jsonl');
    const content = fs.readFileSync(jsonlPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
        try {
            const parsedLine = JSON.parse(line);
            if (parsedLine.graph) {
                const { vertices, edges } = parsedLine.graph;

                // Import nodes
                for (const vertex of vertices) {
                    const id = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${vertex.id.replace(/:/g, '-')}`;
                    const type = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${vertex.label}`;
                    
                    const properties = Object.entries(vertex.properties).reduce((acc, [key, value]) => {
                        const extracted = extractValue(value);
                        if (extracted !== undefined) {
                            // Map `name` and `title` to schema.org prefix
                            if (key === 'name' || key === 'title') {
                                acc[`${SCHEMA_ORG_PREFIX}:${key}`] = extracted;
                            } else {
                                acc[`${GHOSTHACKER_ONTOLOGY_PREFIX}:${key}`] = extracted;
                            }
                        }
                        return acc;
                    }, {} as Record<string, any>);

                    const nodeData = {
                        '@id': id,
                        '@type': type,
                        ...properties
                    };

                    let schema;
                    switch (vertex.label) {
                        case 'character': schema = CharacterSchema; break;
                        case 'project': schema = ProjectSchema; break;
                        case 'episode': schema = EpisodeSchema; break;
                        case 'scene': schema = SceneSchema; break;
                        case 'setting': schema = SettingSchema; break;
                        default: continue;
                    }

                    if (Value.Check(schema, nodeData)) {
                        const query = `
                            MERGE (n { \`@id\`: $id })
                            SET n += $props
                            SET n :\`${type}\`
                        `;
                        await session.run(query, { id: nodeData['@id'], props: nodeData });
                    } else {
                        console.error(`Validation failed for node: ${id}`, [...Value.Errors(schema, nodeData)]);
                    }
                }

                // Import edges
                for (const edge of edges) {
                    const outV_id = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${edge.outV.replace(/:/g, '-')}`;
                    const inV_id = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${edge.inV.replace(/:/g, '-')}`;
                    const relationshipType = edge.label.toUpperCase();
                    
                    const query = `
                        MATCH (a { \`@id\`: $outV_id }), (b { \`@id\`: $inV_id })
                        MERGE (a)-[:\`${relationshipType}\`]->(b)
                    `;
                    await session.run(query, { outV_id, inV_id });
                }
            }
        } catch (error) {
            console.error(`Skipping invalid line: ${line.substring(0, 70)}...`, error);
        }
    }

    console.log('Lore import completed successfully.');
  } catch (error) {
    console.error('Error during lore import:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
