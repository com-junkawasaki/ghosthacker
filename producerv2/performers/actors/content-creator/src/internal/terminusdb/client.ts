/**
 * TerminusDB Client
 * @see https://terminusdb.org/docs/install-terminusdb-js-client/
 * 
 * @context {
 *   "@id": "ex:TerminusDBClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentStorage"
 * }
 */

import { WOQLClient } from '@terminusdb/terminusdb-client';

let client: WOQLClient | null = null;
let currentDb: string | null = null;

/**
 * TerminusDBクライアントを初期化
 * @context {
 *   "@id": "ex:initializeTerminusDB",
 *   "@type": "ex:Activity",
 *   "ex:produces": "ex:InitializedClient"
 * }
 */
export async function initializeTerminusDB(): Promise<void> {
  const url = process.env.TERMINUSDB_URL || 'http://localhost:6363';
  const user = process.env.TERMINUSDB_USER || 'admin';
  const password = process.env.TERMINUSDB_SERVER_PASS || 'root';
  const db = process.env.TERMINUSDB_DB || 'producerv2';

  client = new WOQLClient(url, {
    user,
    key: password,
  });

  await client.connect();
  
  // データベースが存在しない場合は作成
  try {
    await client.db(db);
    currentDb = db;
  } catch (error) {
    // データベースが存在しない場合は作成
    await client.createDatabase(db, { 
      label: 'Producer V2', 
      comment: 'OWL-based LLM Content Generator' 
    });
    await client.db(db);
    currentDb = db;
  }
}

/**
 * TerminusDBクライアントインスタンスを取得
 * @context {
 *   "@id": "ex:getTerminusDBClient",
 *   "@type": "ex:Activity",
 *   "ex:produces": "ex:WOQLClient"
 * }
 */
export function getTerminusDBClient(): WOQLClient {
  if (!client) {
    throw new Error('TerminusDB client not initialized. Call initializeTerminusDB() first.');
  }
  return client;
}

/**
 * 現在のデータベース名を取得
 * @context {
 *   "@id": "ex:getCurrentDatabase",
 *   "@type": "ex:Activity",
 *   "ex:produces": "ex:DatabaseName"
 * }
 */
export function getCurrentDatabase(): string {
  if (!currentDb) {
    throw new Error('Database not set. Call initializeTerminusDB() first.');
  }
  return currentDb;
}

