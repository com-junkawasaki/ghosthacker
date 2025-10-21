import fs from "node:fs";
import path from "node:path";
import { getNeo4jDriver } from "../infra/neo4j/client";
import * as Cypher from "@neo4j/cypher-builder";

const GHOntologyPrefix = 'gh:';

// A generic type for any node in our JSON-LD graph
interface GraphNode {
  '@id': string;
  '@type': string;
  [key: string]: any;
}

async function main() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  const filePath = process.argv[2];
  if (!filePath) {
    console.log("Please provide a file path to an episode JSON-LD file.");
    return;
  }

  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    console.log(`Processing ${absolutePath}...`);

    const content = fs.readFileSync(absolutePath, "utf-8");
    const jsonld = JSON.parse(content);

    if (!jsonld['@graph']) {
        console.error("Invalid JSON-LD file: missing '@graph' array.");
        return;
    }

    const graph: GraphNode[] = jsonld['@graph'];

    // 1. Import all nodes
    for (const node of graph) {
      if (!node || !node["@id"]) continue;
      
      const props = Object.entries(node).reduce(
        (acc, [key, value]) => {
          // Exclude relationship properties from node properties
          if (Array.isArray(value) && value.every(item => item['@id'])) {
            return acc;
          }
           if (typeof value === 'object' && value !== null && '@id' in value) {
            return acc;
          }

          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            acc[key] = value;
          } else {
            acc[key] = JSON.stringify(value);
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      const query = `
        MERGE (n { \`@id\`: $id })
        SET n += $props
        SET n :\`${node["@type"]}\`
      `;
      await session.run(query, { id: node["@id"], props });
      console.log(`MERGED Node: ${node["@id"]}`);
    }
    
    // 2. Import all relationships
    for (const node of graph) {
       for (const [key, value] of Object.entries(node)) {
            if (key.startsWith(GHOntologyPrefix)) {
                const targets = Array.isArray(value) ? value : [value];
                for (const target of targets) {
                    if (target && target['@id']) {
                        const relationshipType = key.split(':')[1].toUpperCase();
                        const query = `
                            MATCH (a { \`@id\`: $sourceId }), (b { \`@id\`: $targetId })
                            MERGE (a)-[:${relationshipType}]->(b)
                        `;
                        await session.run(query, { sourceId: node['@id'], targetId: target['@id'] });
                        console.log(`MERGED Relationship: ${node['@id']} -[${relationshipType}]-> ${target['@id']}`);
                    }
                }
            }
       }
    }

  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
