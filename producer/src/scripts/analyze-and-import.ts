import fs from 'fs';
import path from 'path';
import { getNeo4jDriver } from '../infra/neo4j/client';
import { Value } from '@sinclair/typebox/value';
import { Type } from '@sinclair/typebox';

const GHOSTHACKER_ONTOLOGY_PREFIX = 'gh';
const SCHEMA_ORG_PREFIX = 'schema';

const GenericNodeSchema = Type.Object({
  '@id': Type.String(),
  '@type': Type.String(),
});

function parseMarkdown(content: string): Record<string, any> {
  const data: Record<string, any> = {};
  const lines = content.split('\n');
  let currentSection: string | null = null;
  let currentSubSection: string | null = null;

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.*)/);
    const h3Match = line.match(/^###\s+(.*)/);
    const listItemMatch = line.match(/^\s*-\s*\*\*(.*?)\*\*:\s*(.*)/);

    if (h2Match) {
      currentSection = h2Match[1].trim().toLowerCase().replace(/\s+/g, '_');
      data[currentSection] = {};
      currentSubSection = null;
    } else if (h3Match && currentSection) {
        currentSubSection = h3Match[1].trim().toLowerCase().replace(/\s+/g, '_');
        data[currentSection][currentSubSection] = {};
    } else if (listItemMatch && currentSection) {
        const key = listItemMatch[1].trim().toLowerCase();
        const value = listItemMatch[2].trim();
        if(currentSubSection) {
            data[currentSection][currentSubSection][key] = value;
        } else {
            data[currentSection][key] = value;
        }
    } else if(currentSection) {
        if(typeof data[currentSection] === 'string') {
            data[currentSection] += line + '\n';
        }
    }
  }
  return data;
}

async function main() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    console.log('Please provide file paths as arguments.');
    return;
  }

  try {
    for (const filePath of filePaths) {
      const absolutePath = path.resolve(process.cwd(),'..', filePath);
      console.log(`Processing ${absolutePath}...`);

      const content = fs.readFileSync(absolutePath, 'utf-8');
      const parsedData = parseMarkdown(content);
      
      const fileName = path.basename(filePath, '.md');
      const id = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${fileName.replace(/[\s_]+/g, '-')}`;
      const type = `${GHOSTHACKER_ONTOLOGY_PREFIX}:${path.basename(path.dirname(absolutePath))}`;

      const nodeData = {
        '@id': id,
        '@type': type,
        ...parsedData
      };
      
      if (Value.Check(GenericNodeSchema, nodeData)) {
          const props = Object.entries(nodeData).reduce((acc, [key, value]) => {
              if(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                  acc[key] = value;
              } else {
                  acc[key] = JSON.stringify(value);
              }
              return acc;
          }, {} as Record<string, any>);


        const query = `
            MERGE (n { \`@id\`: $id })
            SET n += $props
            SET n :\`${type}\`
        `;
        await session.run(query, { id, props });
        console.log(`Imported ${id}`);
      } else {
        console.error(`Validation failed for node: ${id}`, [...Value.Errors(GenericNodeSchema, nodeData)]);
      }
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
