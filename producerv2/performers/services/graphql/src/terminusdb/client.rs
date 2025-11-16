/**
 * TerminusDB Client
 * terminusdb-rs ライブラリを使用した実装
 * 
 * @context {
 *   "@id": "ex:TerminusDBClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentStorage"
 * }
 */

use anyhow::Result;
use serde_json::Value;
use std::sync::{Arc, OnceLock};
use terminusdb_client::*;
use terminusdb_schema::{TerminusDBModel, ToTDBInstance, FromTDBInstance, InstanceFromJson};
use tracing::{error, info, warn};

static CLIENT: OnceLock<Arc<TerminusDBHttpClient>> = OnceLock::new();
static DB_NAME: OnceLock<String> = OnceLock::new();

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
    let db_name = std::env::var("TERMINUSDB_DB")
        .unwrap_or_else(|_| "producerv2".to_string());

    info!("Connecting to TerminusDB using terminusdb-rs at {} (db: {})", url, db_name);

    // TerminusDBHttpClient の作成
    // 注意: local_node() は localhost 専用なので、カスタム URL の場合は別の方法が必要
    let client = if url == "http://localhost:6363" || url.contains("localhost") {
        TerminusDBHttpClient::local_node().await
    } else {
        // カスタム URL の場合は、HTTP クライアントを直接作成する必要がある
        // 現在の実装では local_node() のみサポート
        return Err(anyhow::anyhow!("Custom TerminusDB URL not yet supported with terminusdb-rs client. Please use localhost:6363"));
    };

    // データベースの確保
    // TerminusDBが起動するまでリトライ（最大30秒、5秒間隔）
    let max_retries = 6;
    let retry_delay = tokio::time::Duration::from_secs(5);

    for attempt in 1..=max_retries {
        match client.ensure_database(&db_name).await {
            Ok(_) => {
                CLIENT.set(Arc::new(client)).map_err(|_| {
                    anyhow::anyhow!("TerminusDB client already initialized")
                })?;
                DB_NAME.set(db_name.clone()).map_err(|_| {
                    anyhow::anyhow!("Database name already set")
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
    DB_NAME.get().cloned().unwrap_or_else(|| {
        std::env::var("TERMINUSDB_DB")
            .unwrap_or_else(|_| "producerv2".to_string())
    })
}

/// ドキュメントを取得
/// 注意: terminusdb-rs の get メソッドは型安全な取得を推奨しているため、
/// この関数は既存のコードとの互換性のために残していますが、
/// 新しいコードでは get_document_typed を使用することを推奨します
pub async fn get_document(id: &str) -> Result<Value> {
    // terminusdb-rs では型安全な取得を推奨しているため、
    // この関数は非推奨です。新しいコードでは TerminusDBModel を実装した型を使用してください
    error!("get_document with Value is deprecated. Use get_document_typed instead.");
    Err(anyhow::anyhow!("get_document with Value is deprecated. Use get_document_typed instead."))
}

/// 型安全なドキュメント取得
pub async fn get_document_typed<T: TerminusDBModel>(id: &str) -> Result<T> 
where
    T: ToTDBInstance + FromTDBInstance + InstanceFromJson,
{
    let client = get_client()?;
    let db_name = get_database_name();
    let branch = BranchSpec::from(db_name);
    
    // terminusdb-rs の get_instance メソッドを使用
    // DefaultTDBDeserializer を使用してデシリアライズ
    let mut deserializer = DefaultTDBDeserializer;
    client.get_instance(id, &branch, &mut deserializer).await
}

/// ドキュメントを挿入（既存の API との互換性のため）
/// 注意: この関数は既存のコードとの互換性のために残していますが、
/// 新しいコードでは insert_document_typed を使用することを推奨します
pub async fn insert_document(document: &Value) -> Result<()> {
    // terminusdb-rs では型安全な挿入を推奨しているため、
    // この関数は非推奨です。新しいコードでは TerminusDBModel を実装した型を使用してください
    error!("insert_document with Value is deprecated. Use insert_document_typed instead.");
    Err(anyhow::anyhow!("insert_document with Value is deprecated. Use insert_document_typed instead."))
}

/// 型安全なドキュメント挿入
pub async fn insert_document_typed<T: TerminusDBModel>(instance: &T) -> Result<()> {
    let client = get_client()?;
    let db_name = get_database_name();
    let branch = BranchSpec::from(db_name);
    let args = DocumentInsertArgs::from(branch);
    // terminusdb-rs の insert_instance_with_commit_id メソッドを使用
    client.insert_instance_with_commit_id(instance, args).await?;
    Ok(())
}

/// ドキュメントを更新（既存の API との互換性のため）
/// 注意: この関数は既存のコードとの互換性のために残していますが、
/// 新しいコードでは update_document_typed を使用することを推奨します
pub async fn update_document(document: &Value) -> Result<()> {
    // terminusdb-rs では型安全な更新を推奨しているため、
    // この関数は非推奨です。新しいコードでは TerminusDBModel を実装した型を使用してください
    error!("update_document with Value is deprecated. Use update_document_typed instead.");
    Err(anyhow::anyhow!("update_document with Value is deprecated. Use update_document_typed instead."))
}

/// 型安全なドキュメント更新
pub async fn update_document_typed<T: TerminusDBModel>(instance: &T) -> Result<()> {
    let client = get_client()?;
    let db_name = get_database_name();
    let branch = BranchSpec::from(db_name);
    let args = DocumentInsertArgs::from(branch);
    // terminusdb-rs では insert が update も兼ねる
    client.insert_instance_with_commit_id(instance, args).await?;
    Ok(())
}

/// ドキュメントを削除
pub async fn delete_document(id: &str) -> Result<()> {
    let client = get_client()?;
    let db_name = get_database_name();
    let branch = BranchSpec::from(db_name);
    // 注意: terminusdb-rs の delete API に応じて調整が必要
    // 現在は placeholder
    Err(anyhow::anyhow!("delete_document not yet implemented with terminusdb-rs"))
}

/// スキーマを挿入（既存の API との互換性のため）
/// 注意: この関数は既存のコードとの互換性のために残していますが、
/// 新しいコードでは insert_schema_typed を使用することを推奨します
pub async fn insert_schema(schema: &Value) -> Result<()> {
    // terminusdb-rs では型安全なスキーマ挿入を推奨しているため、
    // この関数は非推奨です。新しいコードでは TerminusDBModel を実装した型を使用してください
    error!("insert_schema with Value is deprecated. Use insert_schema_typed instead.");
    Err(anyhow::anyhow!("insert_schema with Value is deprecated. Use insert_schema_typed instead."))
}

/// 型安全なスキーマ挿入
pub async fn insert_schema_typed<T: TerminusDBModel>() -> Result<()> {
    let client = get_client()?;
    let db_name = get_database_name();
    let branch = BranchSpec::from(db_name);
    let args = DocumentInsertArgs::from(branch);
    client.schema::<T>(args).await?;
    Ok(())
}
