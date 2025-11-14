/**
 * TerminusDB Client
 * 
 * @context {
 *   "@id": "ex:TerminusDBClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentStorage"
 * }
 */

use anyhow::{Context, Result};
use std::sync::{Arc, OnceLock};
use terminusdb_rs::TerminusDBHttpClient;
use tracing::{info, warn};

static CLIENT: OnceLock<Arc<TerminusDBHttpClient>> = OnceLock::new();

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

    let client = TerminusDBHttpClient::local_node()
        .await
        .context("Failed to create TerminusDB client")?;

    // データベースの存在確認と作成
    match client.ensure_database(&db_name).await {
        Ok(_) => {
            info!("Database '{}' is ready", db_name);
        }
        Err(e) => {
            warn!("Failed to ensure database: {}", e);
            return Err(e).context("Failed to initialize database");
        }
    }

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
pub fn get_client() -> Result<Arc<TerminusDBHttpClient>> {
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

