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
use serde_json::Value;
use std::sync::{Arc, OnceLock};
use tracing::{info, warn};

pub struct TerminusDBClient {
    http_client: Client,
    base_url: String,
    auth_header: String,
    db_name: String,
}

static CLIENT: OnceLock<Arc<TerminusDBClient>> = OnceLock::new();

impl TerminusDBClient {
    fn new(base_url: String, user: String, password: String, db_name: String) -> Result<Self> {
        let auth = format!("{}:{}", user, password);
        let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(auth.as_bytes()));

        Ok(Self {
            http_client: Client::new(),
            base_url,
            auth_header,
            db_name,
        })
    }

    async fn ensure_database(&self) -> Result<()> {
        let url = format!("{}/api/db/{}", self.base_url, self.db_name);
        let response = self
            .http_client
            .get(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await?;

        if response.status().as_u16() == 404 {
            // データベースが存在しない場合は作成
            let create_url = format!("{}/api/db/{}", self.base_url, self.db_name);
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
        } else if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Failed to check database: {}", error_text));
        } else {
            info!("Database '{}' already exists", self.db_name);
        }

        Ok(())
    }

    pub async fn get_document(&self, id: &str) -> Result<Value> {
        let url = format!(
            "{}/api/document/{}/local/branch/main/{}",
            self.base_url, self.db_name, id
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
            "{}/api/woql/{}/local/branch/main",
            self.base_url, self.db_name
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

    pub async fn insert_document(&self, document: &Value) -> Result<()> {
        let url = format!(
            "{}/api/document/{}/local/branch/main",
            self.base_url, self.db_name
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(document)
            .send()
            .await?;

        response.error_for_status()?;
        Ok(())
    }

    pub async fn update_document(&self, document: &Value) -> Result<()> {
        let url = format!(
            "{}/api/document/{}/local/branch/main",
            self.base_url, self.db_name
        );
        let response = self
            .http_client
            .put(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(document)
            .send()
            .await?;

        response.error_for_status()?;
        Ok(())
    }

    pub async fn delete_document(&self, id: &str) -> Result<()> {
        let url = format!(
            "{}/api/document/{}/local/branch/main/{}",
            self.base_url, self.db_name, id
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
        let url = format!(
            "{}/api/document/{}/local/branch/main?graph_type=schema",
            self.base_url, self.db_name
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
    let db_name = std::env::var("TERMINUSDB_DB")
        .unwrap_or_else(|_| "producerv2".to_string());

    info!("Connecting to TerminusDB at {}", url);

    let client = TerminusDBClient::new(url.clone(), user, password, db_name.clone())?;

    // データベースの存在確認と作成
    client.ensure_database().await?;

    CLIENT.set(Arc::new(client)).map_err(|_| {
        anyhow::anyhow!("TerminusDB client already initialized")
    })?;

    info!("TerminusDB client initialized successfully");
    Ok(())
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
