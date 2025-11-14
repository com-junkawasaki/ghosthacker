/**
 * TerminusDB Client
 * TerminusDBクライアント実装
 */

use anyhow::Result;
use reqwest::Client;
use serde_json::json;
use serde_json::Value;
use std::sync::Arc;
use once_cell::sync::OnceCell;

pub struct TerminusDBClient {
    http_client: Client,
    base_url: String,
    auth_header: String,
    db_name: String,
}

static CLIENT: OnceCell<Arc<TerminusDBClient>> = OnceCell::new();

impl TerminusDBClient {
    pub fn new(base_url: String, user: String, password: String, db_name: String) -> Result<Self> {
        let credentials = format!("{}:{}", user, password);
        let auth_header = format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(credentials));
        Ok(Self {
            http_client: Client::new(),
            base_url,
            auth_header,
            db_name,
        })
    }

    pub async fn ensure_database(&self) -> Result<()> {
        // データベースの存在確認
        let check_url = format!("{}/api/db/{}", self.base_url, self.db_name);
        let response = self
            .http_client
            .get(&check_url)
            .header("Authorization", &self.auth_header)
            .send()
            .await?;

        if response.status().as_u16() == 404 {
            // データベースが存在しない場合は作成
            let create_url = format!("{}/api/db", self.base_url);
            let create_body = json!({
                "label": self.db_name,
                "comment": "Ghost Hacker Game Database"
            });
            
            self.http_client
                .post(&create_url)
                .header("Authorization", &self.auth_header)
                .header("Content-Type", "application/json")
                .json(&create_body)
                .send()
                .await?
                .error_for_status()?;
            
            tracing::info!("Database {} created", self.db_name);
        } else {
            response.error_for_status()?;
        }

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

pub async fn initialize() -> Result<()> {
    let url = std::env::var("TERMINUSDB_URL")
        .unwrap_or_else(|_| "http://localhost:6363".to_string());
    let user = std::env::var("TERMINUSDB_USER")
        .unwrap_or_else(|_| "admin".to_string());
    let password = std::env::var("TERMINUSDB_SERVER_PASS")
        .unwrap_or_else(|_| "root".to_string());
    let db_name = std::env::var("TERMINUSDB_DB")
        .unwrap_or_else(|_| "ghosthacker_game".to_string());

    tracing::info!("Connecting to TerminusDB at {}", url);

    let client = TerminusDBClient::new(url.clone(), user, password, db_name.clone())?;
    client.ensure_database().await?;

    CLIENT.set(Arc::new(client)).map_err(|_| {
        anyhow::anyhow!("TerminusDB client already initialized")
    })?;

    tracing::info!("TerminusDB client initialized successfully");
    Ok(())
}

pub fn get_client() -> Result<Arc<TerminusDBClient>> {
    CLIENT.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("TerminusDB client not initialized. Call initialize() first.")
    })
}

