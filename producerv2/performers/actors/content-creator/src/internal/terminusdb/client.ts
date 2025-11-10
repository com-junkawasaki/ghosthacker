/**
 * TerminusDB Client
 */

import { WOQLClient } from '@terminusdb/terminusdb-client';

let client: WOQLClient | null = null;

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
  } catch {
    await client.createDatabase(db, { label: 'Producer V2', comment: 'OWL-based LLM Content Generator' });
  }
}

export function getTerminusDBClient(): WOQLClient {
  if (!client) {
    throw new Error('TerminusDB client not initialized. Call initializeTerminusDB() first.');
  }
  return client;
}

