/**
 * Database Client
 * SQLx + PostgreSQL を使用した RDF トリプル操作
 * 
 * @context {
 *   "@id": "ex:DatabaseClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentStorage"
 * }
 */

use anyhow::Result;
use serde_json::Value;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use std::sync::{Arc, OnceLock};
use tracing::info;

static POOL: OnceLock<Arc<PgPool>> = OnceLock::new();

/// PostgreSQL 接続プールを初期化
/// 
/// @context {
///   "@id": "ex:initializeDatabase",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:InitializedPool"
/// }
pub async fn initialize() -> Result<()> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string());

    info!("Connecting to PostgreSQL at {}", database_url);

    // 接続プールを作成（最大10接続）
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // マイグレーションを実行
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    POOL.set(Arc::new(pool)).map_err(|_| {
        anyhow::anyhow!("Database pool already initialized")
    })?;

    info!("Database client initialized successfully");
    Ok(())
}

/// 接続プールを取得
/// 
/// @context {
///   "@id": "ex:getDatabasePool",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:DatabasePool"
/// }
pub fn get_pool() -> Result<Arc<PgPool>> {
    POOL.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("Database pool not initialized. Call initialize() first.")
    })
}

/// RDF リソースを取得（トリプルから JSON-LD を再構築）
/// 
/// @context {
///   "@id": "ex:getDocument",
///   "@type": "ex:Activity",
///   "ex:consumes": "ex:ResourceId",
///   "ex:produces": "ex:JSONLD"
/// }
pub async fn get_document(id: &str) -> Result<Value> {
    let pool = get_pool()?;

    // リソースメタデータを取得
    let resource = sqlx::query("SELECT id, type, created_at, updated_at FROM rdf_resources WHERE id = $1")
        .bind(id)
        .fetch_optional(pool.as_ref())
        .await?;

    let Some(resource_row) = resource else {
        return Err(anyhow::anyhow!("Resource not found: {}", id));
    };

    let resource_id: String = resource_row.get(0);
    let resource_type: String = resource_row.get(1);
    let created_at: chrono::DateTime<chrono::Utc> = resource_row.get(2);
    let updated_at: chrono::DateTime<chrono::Utc> = resource_row.get(3);

    // リソースに関連するすべてのトリプルを取得
    let triples = sqlx::query(
        "SELECT predicate, object, object_type FROM rdf_triples WHERE subject = $1 ORDER BY predicate"
    )
    .bind(&resource_id)
    .fetch_all(pool.as_ref())
    .await?;

    // JSON-LD ドキュメントを構築
    let mut doc = serde_json::json!({
        "@id": resource_id,
        "@type": resource_type,
        "ex:createdAt": created_at.to_rfc3339(),
        "ex:updatedAt": updated_at.to_rfc3339()
    });

    // トリプルからプロパティを構築
    for row in triples {
        let predicate: String = row.get(0);
        let object: String = row.get(1);
        let object_type: String = row.get(2);

        // 述語を展開（ex:title -> title）
        let key = predicate
            .strip_prefix("ex:")
            .or_else(|| predicate.strip_prefix("dct:"))
            .unwrap_or(&predicate);

        match object_type.as_str() {
            "uri" => {
                // URI リソース参照
                doc[key] = serde_json::json!({ "@id": object });
            }
            "bnode" => {
                // 空白ノード（簡易実装：文字列として保存）
                doc[key] = serde_json::json!(object);
            }
            _ => {
                // リテラル値
                // 既存の値が配列の場合は追加、そうでなければ配列に変換
                if doc[key].is_array() {
                    doc[key].as_array_mut().unwrap().push(serde_json::json!(object));
                } else if doc[key].is_null() {
                    doc[key] = serde_json::json!(object);
                } else {
                    let existing = doc[key].clone();
                    doc[key] = serde_json::json!([existing, object]);
                }
            }
        }
    }

    Ok(doc)
}

/// RDF リソースを挿入（JSON-LD からトリプルに分解）
/// 
/// @context {
///   "@id": "ex:insertDocument",
///   "@type": "ex:Activity",
///   "ex:consumes": "ex:JSONLD",
///   "ex:produces": "ex:Inserted"
/// }
pub async fn insert_document(document: &Value) -> Result<()> {
    let pool = get_pool()?;

    // トランザクション開始
    let mut tx = pool.begin().await?;

    // @id と @type を取得
    let id = document.get("@id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Document must have @id"))?;
    
    let r#type = document.get("@type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("Document must have @type"))?;

    let now = chrono::Utc::now();

    // リソースメタデータを挿入
    sqlx::query(
        "INSERT INTO rdf_resources (id, type, created_at, updated_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET type = $2, updated_at = $3"
    )
    .bind(id)
    .bind(r#type)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await?;

    // 既存のトリプルを削除（更新の場合）
    sqlx::query("DELETE FROM rdf_triples WHERE subject = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // JSON-LD ドキュメントからトリプルを生成
    for (key, value) in document.as_object().unwrap() {
        // @id, @type, @context はスキップ
        if key == "@id" || key == "@type" || key == "@context" {
            continue;
        }

        // 述語を完全な URI に変換
        let predicate = if key.starts_with("ex:") || key.starts_with("dct:") {
            key.clone()
        } else {
            format!("ex:{}", key)
        };

        // 値を処理
        if value.is_array() {
            for item in value.as_array().unwrap() {
                insert_triple(&mut *tx, id, &predicate, item).await?;
            }
        } else {
            insert_triple(&mut *tx, id, &predicate, value).await?;
        }
    }

    tx.commit().await?;
    Ok(())
}

/// トリプルを挿入（内部ヘルパー関数）
async fn insert_triple(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    subject: &str,
    predicate: &str,
    value: &Value,
) -> Result<()> {
    match value {
        Value::Object(obj) => {
            // オブジェクト（URI 参照または埋め込みリソース）
            if let Some(id) = obj.get("@id").and_then(|v| v.as_str()) {
                sqlx::query(
                    "INSERT INTO rdf_triples (subject, predicate, object, object_type) VALUES ($1, $2, $3, $4)"
                )
                .bind(subject)
                .bind(predicate)
                .bind(id)
                .bind("uri")
                .execute(&mut **tx)
                .await?;
            }
        }
        Value::String(s) => {
            // 文字列リテラル
            sqlx::query(
                "INSERT INTO rdf_triples (subject, predicate, object, object_type) VALUES ($1, $2, $3, $4)"
            )
            .bind(subject)
            .bind(predicate)
            .bind(s)
            .bind("literal")
            .execute(&mut **tx)
            .await?;
        }
        Value::Number(n) => {
            // 数値リテラル
            sqlx::query(
                "INSERT INTO rdf_triples (subject, predicate, object, object_type) VALUES ($1, $2, $3, $4)"
            )
            .bind(subject)
            .bind(predicate)
            .bind(n.to_string())
            .bind("literal")
            .execute(&mut **tx)
            .await?;
        }
        Value::Bool(b) => {
            // ブールリテラル
            sqlx::query(
                "INSERT INTO rdf_triples (subject, predicate, object, object_type) VALUES ($1, $2, $3, $4)"
            )
            .bind(subject)
            .bind(predicate)
            .bind(b.to_string())
            .bind("literal")
            .execute(&mut **tx)
            .await?;
        }
        _ => {
            // その他の型は JSON 文字列として保存
            sqlx::query(
                "INSERT INTO rdf_triples (subject, predicate, object, object_type) VALUES ($1, $2, $3, $4)"
            )
            .bind(subject)
            .bind(predicate)
            .bind(serde_json::to_string(value)?)
            .bind("literal")
            .execute(&mut **tx)
            .await?;
        }
    }
    Ok(())
}

/// RDF リソースを更新
/// 
/// @context {
///   "@id": "ex:updateDocument",
///   "@type": "ex:Activity",
///   "ex:consumes": ["ex:ResourceId", "ex:JSONLD"],
///   "ex:produces": "ex:Updated"
/// }
pub async fn update_document(document: &Value) -> Result<()> {
    // 更新は挿入と同じ処理（既存のトリプルを削除して再挿入）
    insert_document(document).await
}

/// RDF リソースを削除
/// 
/// @context {
///   "@id": "ex:deleteDocument",
///   "@type": "ex:Activity",
///   "ex:consumes": "ex:ResourceId",
///   "ex:produces": "ex:Deleted"
/// }
pub async fn delete_document(id: &str) -> Result<()> {
    let pool = get_pool()?;

    // リソースを削除（CASCADE でトリプルも削除される）
    sqlx::query("DELETE FROM rdf_resources WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;

    Ok(())
}

/// すべてのリソースを取得（簡易実装）
/// 
/// @context {
///   "@id": "ex:getAllResources",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:ResourceList"
/// }
pub async fn get_all_resources(r#type: Option<&str>) -> Result<Vec<String>> {
    let pool = get_pool()?;

    let rows = if let Some(t) = r#type {
        sqlx::query("SELECT id FROM rdf_resources WHERE type = $1")
            .bind(t)
            .fetch_all(pool.as_ref())
            .await?
    } else {
        sqlx::query("SELECT id FROM rdf_resources")
            .fetch_all(pool.as_ref())
            .await?
    };

    Ok(rows.iter().map(|row| row.get::<String, _>(0)).collect())
}

