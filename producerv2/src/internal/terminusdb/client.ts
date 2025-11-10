/**
 * TerminusDB JavaScriptクライアントラッパー
 * 
 * @see https://terminusdb.org/docs/javascript/
 */

import { WOQLClient } from '@terminusdb/terminusdb-client';

/**
 * TerminusDB接続設定
 */
export interface TerminusDBConfig {
  serverUrl: string;
  user: string;
  key: string;
  db: string;
  organization?: string;
}

/**
 * TerminusDBクライアントシングルトン
 */
class TerminusDBClientManager {
  private client: WOQLClient | null = null;
  private config: TerminusDBConfig | null = null;

  /**
   * クライアントを初期化
   */
  async initialize(config: TerminusDBConfig): Promise<void> {
    this.config = config;
    this.client = new WOQLClient(config.serverUrl, {
      user: config.user,
      key: config.key,
    });

    if (config.organization) {
      this.client.setOrganization(config.organization);
    }

    await this.client.connect();
  }

  /**
   * クライアントインスタンスを取得
   */
  getClient(): WOQLClient {
    if (!this.client) {
      throw new Error('TerminusDB client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * データベースを作成
   */
  async createDatabase(dbId: string, label?: string, comment?: string): Promise<void> {
    const client = this.getClient();
    await client.createDatabase(dbId, {
      label: label ?? dbId,
      comment: comment ?? `Database for ${dbId}`,
    });
  }

  /**
   * データベースを削除
   */
  async deleteDatabase(dbId: string): Promise<void> {
    const client = this.getClient();
    await client.deleteDatabase(dbId);
  }

  /**
   * データベースが存在するか確認
   */
  async databaseExists(dbId: string): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.db(dbId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 現在のデータベースを設定
   */
  setDatabase(dbId: string): void {
    const client = this.getClient();
    client.db(dbId);
  }
}

// シングルトンインスタンス
export const terminusDBClient = new TerminusDBClientManager();

/**
 * TerminusDBクライアントを初期化（環境変数から設定を読み込み）
 */
export async function initializeTerminusDB(): Promise<void> {
  const serverUrl = process.env.TERMINUSDB_URL ?? 'http://localhost:6363';
  const user = process.env.TERMINUSDB_USER ?? 'admin';
  const key = process.env.TERMINUSDB_SERVER_PASS ?? 'root';
  const db = process.env.TERMINUSDB_DB ?? 'producerv2';
  const organization = process.env.TERMINUSDB_ORGANIZATION;

  await terminusDBClient.initialize({
    serverUrl,
    user,
    key,
    db,
    organization,
  });

  // データベースが存在しない場合は作成
  const exists = await terminusDBClient.databaseExists(db);
  if (!exists) {
    await terminusDBClient.createDatabase(db, 'Producer V2', 'OWL-based LLM Content Generator');
  }

  terminusDBClient.setDatabase(db);
}

