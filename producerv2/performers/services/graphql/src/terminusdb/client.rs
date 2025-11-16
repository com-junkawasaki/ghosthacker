/**
 * TerminusDB Client
 * TerminusDB HTTP APIを直接使用
 * 
 * @context {
 *   "@id": "ex:TerminusDBClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentStorage"
 * }
 */

use anyhow::{Context, Result};
use base64::{engine::general_purpose, Engine as _};
use reqwest::Client;
use serde_json::{json, Value};
use std::sync::{Arc, OnceLock};
use tracing::{error, info, warn};
use urlencoding::encode;

pub struct TerminusDBClient {
    http_client: Client,
    base_url: String,
    auth_header: String,
    organization: String,
    db_name: String,
}

static CLIENT: OnceLock<Arc<TerminusDBClient>> = OnceLock::new();

impl TerminusDBClient {
    fn new(base_url: String, user: String, password: String, organization: String, db_name: String) -> Result<Self> {
        let auth = format!("{}:{}", user, password);
        let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(auth.as_bytes()));

        Ok(Self {
            http_client: Client::new(),
            base_url,
            auth_header,
            organization,
            db_name,
        })
    }

            async fn ensure_database(&self) -> Result<()> {
                let reset_db = std::env::var("TERMINUSDB_RESET_DB")
                    .unwrap_or_else(|_| "false".to_string())
                    .parse::<bool>()
                    .unwrap_or(false);

                info!("Checking database '{}/{}' at {}", self.organization, self.db_name, self.base_url);
                let url = format!("{}/api/db/{}/{}", self.base_url, self.organization, self.db_name);
                info!("GET {}", url);
                let response = self
                    .http_client
                    .get(&url)
                    .header("Authorization", &self.auth_header)
                    .send()
                    .await?;

                if response.status().is_success() {
                    // データベースが存在する場合
                    if reset_db {
                        // リセットが有効な場合は削除して再作成
                        info!("Resetting database '{}/{}' (TERMINUSDB_RESET_DB=true)", self.organization, self.db_name);
                        let delete_url = format!("{}/api/db/{}/{}", self.base_url, self.organization, self.db_name);
                        let delete_response = self
                            .http_client
                            .delete(&delete_url)
                            .header("Authorization", &self.auth_header)
                            .send()
                            .await?;

                        if !delete_response.status().is_success() {
                            let error_text = delete_response.text().await.unwrap_or_default();
                            warn!("Failed to delete database (may not exist): {}", error_text);
                        } else {
                            info!("Database '{}' deleted successfully", self.db_name);
                        }
                    } else {
                        // リセットが無効な場合はそのまま使用
                        info!("Database '{}' already exists, using existing database", self.db_name);
                        return Ok(());
                    }
                } else if response.status().as_u16() != 404 {
                    // 404以外のエラーの場合
                    let error_text = response.text().await.unwrap_or_default();
                    return Err(anyhow::anyhow!("Failed to check database: {}", error_text));
                }

                // データベースを作成
                let create_url = format!("{}/api/db/{}/{}", self.base_url, self.organization, self.db_name);
                info!("POST {} with organization='{}' db_name='{}'", create_url, self.organization, self.db_name);
                let create_body = serde_json::json!({
                    "label": "Producer V2",
                    "comment": "OWL-based LLM Content Generator"
                });

                let create_response = self
                    .http_client
                    .post(&create_url)
                    .header("Authorization", &self.auth_header)
                    .header("Content-Type", "application/json")
                    .json(&create_body)
                    .send()
                    .await?;

                if !create_response.status().is_success() {
                    let error_text = create_response.text().await.unwrap_or_default();
                    return Err(anyhow::anyhow!("Failed to create database: {}", error_text));
                }
                info!("Database '{}' created successfully", self.db_name);

                Ok(())
            }

    pub async fn get_document(&self, id: &str) -> Result<Value> {
        let url = format!(
            "{}/api/document/{}/{}/local/branch/main/{}",
            self.base_url, self.organization, self.db_name, id
        );
        let response = self
            .http_client
            .get(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await?;

        if response.status().as_u16() == 404 {
            return Err(anyhow::anyhow!("Document not found: {}", id));
        }

        response
            .error_for_status()?
            .json()
            .await
            .context("Failed to parse document response")
    }

    pub async fn query_documents(&self, query: Value) -> Result<Vec<Value>> {
        let url = format!(
            "{}/api/woql/{}/{}/local/branch/main",
            self.base_url, self.organization, self.db_name
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&query)
            .send()
            .await?;

        let result: Value = response.error_for_status()?.json().await?;
        // WOQLクエリの結果からドキュメントを抽出
        // 簡易実装: 実際のWOQLクエリ結果の構造に応じて調整が必要
        Ok(vec![result])
    }

            /// JSON-LDドキュメントに@contextを追加（スキップ）
            fn add_jsonld_context(_document: &mut Value) {
                // @contextを追加しない（プレーンJSONとして送信）
            }

    /// デフォルトの author を取得
    /// 環境変数 TERMINUSDB_AUTHOR が設定されている場合はそれを使用、なければ "system" を返す
    fn get_default_author() -> String {
        std::env::var("TERMINUSDB_AUTHOR")
            .unwrap_or_else(|_| "system".to_string())
    }

    /// デフォルトの message を取得
    /// 環境変数 TERMINUSDB_MESSAGE が設定されている場合はそれを使用、なければ "Document created" を返す
    fn get_default_message() -> String {
        std::env::var("TERMINUSDB_MESSAGE")
            .unwrap_or_else(|_| "Document created".to_string())
    }

    pub async fn insert_document(&self, document: &Value) -> Result<()> {
        self.insert_document_with_author(document, None, None).await
    }

    pub async fn insert_document_with_author(&self, document: &Value, author: Option<&str>, message: Option<&str>) -> Result<()> {
        let mut doc = document.clone();
        Self::add_jsonld_context(&mut doc);

        // author が None の場合はデフォルト値を取得
        let default_author = Self::get_default_author();
        let author_str = author.unwrap_or_else(|| default_author.as_str());
        let encoded_author = encode(author_str);

        // message が None の場合はデフォルト値を取得
        let default_message = Self::get_default_message();
        let message_str = message.unwrap_or_else(|| default_message.as_str());
        let encoded_message = encode(message_str);

        let url = format!(
            "{}/api/document/{}/{}/local/branch/main?author={}&message={}",
            self.base_url, self.organization, self.db_name, encoded_author, encoded_message
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&doc)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("TerminusDB insert error ({}): {}", status, error_text);
            error!("Request document: {}", serde_json::to_string_pretty(&doc).unwrap_or_default());
            return Err(anyhow::anyhow!("TerminusDB error ({}): {}", status, error_text));
        }

        Ok(())
    }

    pub async fn update_document(&self, document: &Value) -> Result<()> {
        self.update_document_with_author(document, None, None).await
    }

    pub async fn update_document_with_author(&self, document: &Value, author: Option<&str>, message: Option<&str>) -> Result<()> {
        let mut doc = document.clone();
        Self::add_jsonld_context(&mut doc);

        // author が None の場合はデフォルト値を取得
        let default_author = Self::get_default_author();
        let author_str = author.unwrap_or_else(|| default_author.as_str());
        let encoded_author = encode(author_str);

        // message が None の場合はデフォルト値を取得
        let default_message = Self::get_default_message();
        let message_str = message.unwrap_or_else(|| default_message.as_str());
        let encoded_message = encode(message_str);

        let url = format!(
            "{}/api/document/{}/{}/local/branch/main?author={}&message={}",
            self.base_url, self.organization, self.db_name, encoded_author, encoded_message
        );
        let response = self
            .http_client
            .put(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&doc)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("TerminusDB update error ({}): {}", status, error_text);
            error!("Request document: {}", serde_json::to_string_pretty(&doc).unwrap_or_default());
            return Err(anyhow::anyhow!("TerminusDB error ({}): {}", status, error_text));
        }

        Ok(())
    }

    pub async fn delete_document(&self, id: &str) -> Result<()> {
        let url = format!(
            "{}/api/document/{}/{}/local/branch/main/{}",
            self.base_url, self.organization, self.db_name, id
        );
        let response = self
            .http_client
            .delete(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await?;

        response.error_for_status()?;
        Ok(())
    }

    pub async fn insert_schema(&self, schema: &Value) -> Result<()> {
        // author と message パラメータを追加
        let default_author = Self::get_default_author();
        let default_message = Self::get_default_message();
        let encoded_author = encode(&default_author);
        let encoded_message = encode(&default_message);
        
        let url = format!(
            "{}/api/document/{}/{}/local/branch/main?graph_type=schema&author={}&message={}",
            self.base_url, self.organization, self.db_name, encoded_author, encoded_message
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(schema)
            .send()
            .await?;

        response.error_for_status()?;
        Ok(())
    }
}

/// TerminusDBクライアントを初期化
/// 
/// @context {
///   "@id": "ex:initializeTerminusDB",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:InitializedClient"
/// }
pub async fn initialize() -> Result<()> {
    let url = std::env::var("TERMINUSDB_URL")
        .unwrap_or_else(|_| "http://localhost:6363".to_string());
    let user = std::env::var("TERMINUSDB_USER")
        .unwrap_or_else(|_| "admin".to_string());
    let password = std::env::var("TERMINUSDB_SERVER_PASS")
        .unwrap_or_else(|_| "root".to_string());
    let organization = std::env::var("TERMINUSDB_ORGANIZATION")
        .unwrap_or_else(|_| "admin".to_string());
    let db_name = std::env::var("TERMINUSDB_DB")
        .unwrap_or_else(|_| "producerv2".to_string());

    info!("Connecting to TerminusDB at {} (organization: {}, db: {})", url, organization, db_name);

    let client = TerminusDBClient::new(url.clone(), user, password, organization.clone(), db_name.clone())?;

    // TerminusDBが起動するまでリトライ（最大30秒、5秒間隔）
    let max_retries = 6;
    let retry_delay = tokio::time::Duration::from_secs(5);

    for attempt in 1..=max_retries {
        match client.ensure_database().await {
            Ok(_) => {
    CLIENT.set(Arc::new(client)).map_err(|_| {
        anyhow::anyhow!("TerminusDB client already initialized")
    })?;
    info!("TerminusDB client initialized successfully");
                return Ok(());
            }
            Err(e) => {
                if attempt < max_retries {
                    warn!("Failed to connect to TerminusDB (attempt {}/{}): {}. Retrying in {:?}...", 
                          attempt, max_retries, e, retry_delay);
                    tokio::time::sleep(retry_delay).await;
                } else {
                    return Err(anyhow::anyhow!("Failed to connect to TerminusDB after {} attempts: {}", max_retries, e));
                }
            }
        }
    }

    Err(anyhow::anyhow!("Failed to initialize TerminusDB client"))
}

/// TerminusDBクライアントインスタンスを取得
/// 
/// @context {
///   "@id": "ex:getTerminusDBClient",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:TerminusDBClient"
/// }
pub fn get_client() -> Result<Arc<TerminusDBClient>> {
    CLIENT.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("TerminusDB client not initialized. Call initialize() first.")
    })
}

/// 現在のデータベース名を取得
/// 
/// @context {
///   "@id": "ex:getCurrentDatabase",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:DatabaseName"
/// }
pub fn get_database_name() -> String {
    std::env::var("TERMINUSDB_DB")
        .unwrap_or_else(|_| "producerv2".to_string())
}
