/**
 * TerminusDB OWL Schema
 * @context {
 *   "@id": "ex:TerminusDBSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:SchemaManagement"
 * }
 */

import { getTerminusDBClient, getCurrentDatabase } from '../client';
import { readFileSync } from 'fs';
import { join } from 'path';

// JSON-LDスキーマを読み込む
const schemaPath = join(process.cwd(), 'src/internal/terminusdb/schema/owl-schema.jsonld');
const schemaData = JSON.parse(readFileSync(schemaPath, 'utf-8')) as {
  '@context': Record<string, string>;
  '@graph': Array<Record<string, unknown>>;
};

/**
 * OWLスキーマをTerminusDBに適用
 * @context {
 *   "@id": "ex:applyOWLSchema",
 *   "@type": "ex:Activity",
 *   "ex:produces": "ex:AppliedSchema"
 * }
 */
export async function applyOWLSchema(): Promise<void> {
  const client = getTerminusDBClient();
  const db = getCurrentDatabase();
  
  try {
    // スキーマグラフに挿入
    // TerminusDBでは、スキーマはschemaグラフに挿入されます
    const schemaDocuments = Array.isArray(schemaData['@graph']) 
      ? schemaData['@graph'] 
      : [schemaData];
    
    for (const schemaDoc of schemaDocuments) {
      try {
        await client.addDocument(schemaDoc, { 
          graph_type: 'schema',
          full_replace: false 
        }, db);
      } catch {
        // 既に存在する場合はスキップ
        const docId = '@id' in schemaDoc ? schemaDoc['@id'] : 'unknown';
        console.log('Schema document may already exist, skipping:', docId);
      }
    }
    
    console.log('OWL schema applied successfully');
  } catch (error) {
    console.error('Error applying OWL schema:', error);
    throw error;
  }
}

