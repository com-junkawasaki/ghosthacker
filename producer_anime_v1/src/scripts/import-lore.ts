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
function extractValue(value: { value: unknown }[]): unknown {
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

    // Use the integrated JSON-LD file instead of problematic gftd.jsonl
    const integratedJsonldPath = path.resolve(process.cwd(), '..', '251022', 'ghost-hacker.jsonld');
    const characterJsonldPath = path.resolve(process.cwd(), 'src', 'ontology', 'characters.jsonld');

    // Process integrated JSON-LD file
    if (fs.existsSync(integratedJsonldPath)) {
        console.log('Processing integrated JSON-LD file...');
        const integratedContent = fs.readFileSync(integratedJsonldPath, 'utf-8');
        const integratedData = JSON.parse(integratedContent);

        if (integratedData['@graph']) {
            for (const vertex of integratedData['@graph']) {
                const id = vertex['@id'];
                const type = vertex['@type'];
                const props = { ...vertex };

                // Remove all relationship properties before import (Neo4j doesn't allow objects as properties)
                const relationshipKeys = [
                    'gh:ghost', 'gh:master', 'gh:createdBy', 'parent', 'spouse', 'sibling', 'colleague',
                    'worksFor', 'founder', 'knows', 'gh:hasCharacter', 'gh:hasSetting', 'gh:hasTechnology',
                    'gh:hasCompany', 'gh:soundtrack', 'gh:certification', 'gh:location'
                ];

                relationshipKeys.forEach(key => {
                    delete props[key];
                });

                const query = `
                    MERGE (n { \`@id\`: $id })
                    SET n += $props
                    SET n :\`${type}\`
                `;
                await session.run(query, { id, props });
            }

            // Import relationships
            for (const vertex of integratedData['@graph']) {
                const sourceId = vertex['@id'];

                // Handle relationships
                if (vertex['gh:ghost']) {
                    const targetId = vertex['gh:ghost']['@id'];
                    const query = `
                        MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                        MERGE (a)-[:HAS_GHOST]->(b)
                    `;
                    await session.run(query, { sourceId, targetId });
                }

                if (vertex['gh:master']) {
                    const targetId = vertex['gh:master']['@id'];
                    const query = `
                        MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                        MERGE (a)-[:HAS_MASTER]->(b)
                    `;
                    await session.run(query, { sourceId, targetId });
                }

                if (vertex['gh:createdBy']) {
                    const targetId = vertex['gh:createdBy']['@id'];
                    const query = `
                        MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                        MERGE (a)-[:CREATED_BY]->(b)
                    `;
                    await session.run(query, { sourceId, targetId });
                }

                if (vertex['parent']) {
                    const parents = Array.isArray(vertex['parent']) ? vertex['parent'] : [vertex['parent']];
                    for (const parent of parents) {
                        const targetId = parent['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:HAS_PARENT]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }

                if (vertex['worksFor']) {
                    const targetId = vertex['worksFor']['@id'];
                    const query = `
                        MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                        MERGE (a)-[:WORKS_FOR]->(b)
                    `;
                    await session.run(query, { sourceId, targetId });
                }

                if (vertex['founder']) {
                    const targetId = vertex['founder']['@id'];
                    const query = `
                        MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                        MERGE (a)-[:FOUNDED_BY]->(b)
                    `;
                    await session.run(query, { sourceId, targetId });
                }

                if (vertex['knows']) {
                    const knows = Array.isArray(vertex['knows']) ? vertex['knows'] : [vertex['knows']];
                    for (const known of knows) {
                        const targetId = known['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:KNOWS]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }

                if (vertex['gh:hasCharacter']) {
                    const characters = Array.isArray(vertex['gh:hasCharacter']) ? vertex['gh:hasCharacter'] : [vertex['gh:hasCharacter']];
                    for (const character of characters) {
                        const targetId = character['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:HAS_CHARACTER]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }

                if (vertex['gh:hasSetting']) {
                    const settings = Array.isArray(vertex['gh:hasSetting']) ? vertex['gh:hasSetting'] : [vertex['gh:hasSetting']];
                    for (const setting of settings) {
                        const targetId = setting['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:HAS_SETTING]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }

                if (vertex['gh:hasTechnology']) {
                    const technologies = Array.isArray(vertex['gh:hasTechnology']) ? vertex['gh:hasTechnology'] : [vertex['gh:hasTechnology']];
                    for (const technology of technologies) {
                        const targetId = technology['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:HAS_TECHNOLOGY]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }

                if (vertex['gh:hasCompany']) {
                    const companies = Array.isArray(vertex['gh:hasCompany']) ? vertex['gh:hasCompany'] : [vertex['gh:hasCompany']];
                    for (const company of companies) {
                        const targetId = company['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:HAS_COMPANY]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }

                if (vertex['gh:soundtrack']) {
                    const soundtracks = Array.isArray(vertex['gh:soundtrack']) ? vertex['gh:soundtrack'] : [vertex['gh:soundtrack']];
                    for (const soundtrack of soundtracks) {
                        const targetId = soundtrack['@id'];
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:HAS_SOUNDTRACK]->(b)
                        `;
                        await session.run(query, { sourceId, targetId });
                    }
                }
            }
        }
    }

    // Fallback: Process characters.jsonld if integrated file doesn't exist
    if (!fs.existsSync(integratedJsonldPath) && fs.existsSync(characterJsonldPath)) {
        const characterContent = fs.readFileSync(characterJsonldPath, 'utf-8');
        const characterData = JSON.parse(characterContent);
        if (characterData['@graph']) {
            for (const vertex of characterData['@graph']) {
                const id = vertex['@id'];
                const type = vertex['@type'];
                const props = { ...vertex };
                delete props[`${GHOSTHACKER_ONTOLOGY_PREFIX}:has_ghost`]; // Remove relationship object before import

                const query = `
                    MERGE (n { \`@id\`: $id })
                    SET n += $props
                    SET n :\`${type}\`
                `;
                await session.run(query, { id, props });
            }
        }
    }

    // Skip the problematic gftd.jsonl processing
    const lines: string[] = [];

    for (const line of lines) {
        try {
            const parsedLine = JSON.parse(line);
            // Handle graph objects (first line)
            if (parsedLine.graph) {
                const { vertices, edges } = parsedLine.graph;

                // Import nodes
                for (const vertex of vertices) {
                    const id = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${vertex.id.replace(/:/g, '-')}`;
                    const type = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${vertex.label}`;

                    const properties = Object.entries(vertex.properties).reduce((acc, [key, value]) => {
                        const extracted = extractValue(value as { value: unknown }[]);
                        if (extracted !== undefined) {
                            // Map `name` and `title` to schema.org prefix
                            if (key === 'name' || key === 'title') {
                                acc[`${SCHEMA_ORG_PREFIX}:${key}`] = extracted;
                            } else {
                                acc[`${GHOSTHACKER_ONTOLOGY_PREFIX}:${key}`] = extracted;
                            }
                        }
                        return acc;
                    }, {} as Record<string, unknown>);

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
            // Handle individual scene objects (subsequent lines)
            else if (parsedLine.id && parsedLine.label === 'scene') {
                const id = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${parsedLine.id}`;
                const type = `${GHOSTHACKER_ONTOLOGY_PREFIX}:scene`;

                const properties = Object.entries(parsedLine.properties).reduce((acc, [key, value]) => {
                    const extracted = extractValue(value as { value: unknown }[]);
                    if (extracted !== undefined) {
                        // Map `name` to schema.org prefix
                        if (key === 'name') {
                            acc[`${SCHEMA_ORG_PREFIX}:${key}`] = extracted;
                        } else {
                            acc[`${GHOSTHACKER_ONTOLOGY_PREFIX}:${key}`] = extracted;
                        }
                    }
                    return acc;
                }, {} as Record<string, unknown>);

                const nodeData = {
                    '@id': id,
                    '@type': type,
                    ...properties
                };

                if (Value.Check(SceneSchema, nodeData)) {
                    const query = `
                        MERGE (n { \`@id\`: $id })
                        SET n += $props
                        SET n :\`${type}\`
                    `;
                    await session.run(query, { id: nodeData['@id'], props: nodeData });
                } else {
                    console.error(`Validation failed for scene: ${id}`, [...Value.Errors(SceneSchema, nodeData)]);
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
