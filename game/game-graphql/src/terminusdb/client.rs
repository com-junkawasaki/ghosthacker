/**
 * TerminusDB Client
 * TerminusDBクライアント実装
 */

use anyhow::Result;
use reqwest::Client;
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
        let auth_header = format!("Basic {}", base64::encode(format!("{}:{}", user, password)));
        Ok(Self {
            http_client: Client::new(),
            base_url,
            auth_header,
            db_name,
        })
    }

    pub async fn ensure_database(&self) -> Result<()> {
        // TODO: データベースの存在確認と作成
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

