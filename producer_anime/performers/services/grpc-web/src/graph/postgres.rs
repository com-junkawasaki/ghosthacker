/**
 * PostgreSQL Graph Client
 * PostgreSQL + pgvectorを使用したグラフ操作実装
 * 
 * @context {
 *   "@id": "ex:PostgreSQLGraphClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphDatabase"
 * }
 */

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{postgres::PgPool, Column, Row, types::Json};
use std::sync::{Arc, OnceLock};
use tracing::{error, info};

use crate::database::client::get_pool;

static CLIENT: OnceLock<Arc<PostgreSQLGraphClient>> = OnceLock::new();

/// PostgreSQLグラフクライアントを初期化
pub async fn initialize() -> Result<()> {
    let pool = get_pool()?;
    let client = PostgreSQLGraphClient::new(pool);
    
    CLIENT.set(Arc::new(client)).map_err(|_| {
        anyhow::anyhow!("PostgreSQL graph client already initialized")
    })?;

    info!("PostgreSQL graph client initialized successfully");
    Ok(())
}

/// PostgreSQLグラフクライアントを取得
pub fn get_client() -> Result<Arc<PostgreSQLGraphClient>> {
    CLIENT.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("PostgreSQL graph client not initialized. Call initialize() first.")
    })
}

/// PostgreSQLグラフクライアント
pub struct PostgreSQLGraphClient {
    pool: Arc<PgPool>,
}

impl PostgreSQLGraphClient {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self { pool }
    }

    /// ノードを作成
    pub async fn create_node(&self, node: &GraphNode) -> Result<String> {
        let id = node.id.clone().unwrap_or_else(|| nanoid::nanoid!());
        
        let vector_param = node.vector.as_ref().map(|v| {
            format!("[{}]", v.iter()
                .map(|f| f.to_string())
                .collect::<Vec<_>>()
                .join(","))
        });
        
        sqlx::query(
            r#"
            INSERT INTO graph_nodes (id, label, properties, vector, jsonld)
            VALUES ($1, $2, $3, $4::vector, $5)
            ON CONFLICT (id) DO UPDATE
            SET label = EXCLUDED.label,
                properties = EXCLUDED.properties,
                vector = EXCLUDED.vector,
                jsonld = EXCLUDED.jsonld,
                updated_at = NOW()
            "#,
        )
        .bind(&id)
        .bind(&node.label)
        .bind(&node.properties)
        .bind(vector_param.as_deref())
        .bind(&node.jsonld)
        .execute(&*self.pool)
        .await?;

        Ok(id)
    }

    /// ノードを取得
    pub async fn get_node(&self, id: &str) -> Result<Option<GraphNode>> {
        let row = sqlx::query(
            r#"
            SELECT id, label, properties, vector, jsonld
            FROM graph_nodes
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&*self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(GraphNode {
                id: Some(row.try_get("id")?),
                label: row.try_get("label")?,
                properties: row.try_get("properties")?,
                vector: None, // ベクトルは必要に応じて取得
                jsonld: row.try_get("jsonld")?,
            }))
        } else {
            Ok(None)
        }
    }

    /// ノードを更新
    pub async fn update_node(&self, id: &str, node: &GraphNode) -> Result<()> {
        let vector_param = node.vector.as_ref().map(|v| {
            format!("[{}]", v.iter()
                .map(|f| f.to_string())
                .collect::<Vec<_>>()
                .join(","))
        });
        
        sqlx::query(
            r#"
            UPDATE graph_nodes
            SET label = $2,
                properties = $3,
                vector = $4::vector,
                jsonld = $5,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(&node.label)
        .bind(&node.properties)
        .bind(vector_param.as_deref())
        .bind(&node.jsonld)
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    /// ノードを削除
    pub async fn delete_node(&self, id: &str) -> Result<()> {
        sqlx::query(
            r#"
            DELETE FROM graph_nodes
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    /// エッジを作成
    pub async fn create_edge(&self, edge: &GraphEdge) -> Result<String> {
        let id = edge.id.clone().unwrap_or_else(|| nanoid::nanoid!());
        
        sqlx::query(
            r#"
            INSERT INTO graph_edges (id, source_id, target_id, label, properties)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE
            SET source_id = EXCLUDED.source_id,
                target_id = EXCLUDED.target_id,
                label = EXCLUDED.label,
                properties = EXCLUDED.properties,
                updated_at = NOW()
            "#,
        )
        .bind(&id)
        .bind(&edge.source)
        .bind(&edge.target)
        .bind(&edge.label)
        .bind(&edge.properties)
        .execute(&*self.pool)
        .await?;

        Ok(id)
    }

    /// エッジを取得
    pub async fn get_edge(&self, id: &str) -> Result<Option<GraphEdge>> {
        let row = sqlx::query(
            r#"
            SELECT id, source_id, target_id, label, properties
            FROM graph_edges
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&*self.pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(GraphEdge {
                id: Some(row.try_get("id")?),
                source: row.try_get("source_id")?,
                target: row.try_get("target_id")?,
                label: row.try_get("label")?,
                properties: row.try_get("properties")?,
            }))
        } else {
            Ok(None)
        }
    }

    /// エッジを削除
    pub async fn delete_edge(&self, id: &str) -> Result<()> {
        sqlx::query(
            r#"
            DELETE FROM graph_edges
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&*self.pool)
        .await?;

        Ok(())
    }

    /// グラフクエリを実行（簡易的なSPARQL風クエリ）
    /// 実際の実装では、より高度なクエリパーサーが必要
    pub async fn query(&self, query: &str) -> Result<Value> {
        // 簡易的な実装：実際にはSPARQLパーサーを使用
        // ここでは、基本的なSQLクエリとして実行
        // セキュリティのため、SELECT文のみ許可
        
        if !query.trim_start().to_uppercase().starts_with("SELECT") {
            return Err(anyhow::anyhow!("Only SELECT queries are allowed"));
        }

        let rows = sqlx::query(query)
            .fetch_all(&*self.pool)
            .await?;

        let mut results = Vec::new();
        for row in rows {
            let mut map = serde_json::Map::new();
            for (i, column) in row.columns().iter().enumerate() {
                let column_name = column.name();
                let value: Value = {
                    // JSONB型のカラム（properties, jsonld）を優先的に処理
                    if column_name == "properties" || column_name == "jsonld" {
                        match row.try_get::<Option<Json<Value>>, _>(i) {
                            Ok(Some(json)) => json.0,
                            Ok(None) => Value::Null,
                            Err(_) => {
                                // JSONBとして取得できない場合は、文字列として試す
                                match row.try_get::<Option<String>, _>(i) {
                                    Ok(Some(s)) => {
                                        // 文字列をJSONとしてパース
                                        serde_json::from_str(&s).unwrap_or(Value::String(s))
                                    }
                                    Ok(None) => Value::Null,
                                    Err(_) => Value::Null,
                                }
                            }
                        }
                    } else {
                        // その他のカラムは型を判定して取得
                        // まず文字列として試す
                        match row.try_get::<Option<String>, _>(i) {
                            Ok(Some(v)) => Value::String(v),
                            Ok(None) => Value::Null,
                            Err(_) => {
                                // 整数として試す
                                match row.try_get::<Option<i64>, _>(i) {
                                    Ok(Some(v)) => Value::Number(v.into()),
                                    Ok(None) => Value::Null,
                                    Err(_) => {
                                        // 浮動小数点として試す
                                        match row.try_get::<Option<f64>, _>(i) {
                                            Ok(Some(v)) => {
                                                Value::Number(serde_json::Number::from_f64(v).unwrap_or(0.into()))
                                            }
                                            Ok(None) => Value::Null,
                                            Err(_) => {
                                                // ブール値として試す
                                                match row.try_get::<Option<bool>, _>(i) {
                                                    Ok(Some(v)) => Value::Bool(v),
                                                    Ok(None) => Value::Null,
                                                    Err(_) => Value::Null,
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
                map.insert(column_name.to_string(), value);
            }
            results.push(Value::Object(map));
        }

        Ok(Value::Array(results))
    }

    /// ベクトル検索（pgvectorを使用）
    pub async fn vector_search(&self, query_vector: &[f32], limit: usize) -> Result<Vec<VectorSearchResult>> {
        // pgvectorのベクトル型はPostgreSQLの配列として扱う
        // ベクトルをPostgreSQLの配列形式の文字列に変換
        let vector_str = format!("[{}]", query_vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));

        // SQL関数を使用してベクトル検索を実行
        let rows = sqlx::query(
            r#"
            SELECT 
                id,
                label,
                properties,
                jsonld,
                1 - (vector <=> $1::vector) as similarity
            FROM graph_nodes
            WHERE vector IS NOT NULL
            ORDER BY vector <=> $1::vector
            LIMIT $2
            "#,
        )
        .bind(&vector_str)
        .bind(limit as i64)
        .fetch_all(&*self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let node_id: String = row.try_get("id")?;
            let label: String = row.try_get("label")?;
            let properties: Value = row.try_get("properties")?;
            let jsonld: Value = row.try_get("jsonld")?;
            let similarity: f64 = row.try_get("similarity")?;
            
            results.push(VectorSearchResult {
                node_id: node_id.clone(),
                score: similarity as f32,
                node: Some(GraphNode {
                    id: Some(node_id),
                    label,
                    properties,
                    vector: None,
                    jsonld,
                }),
            });
        }

        Ok(results)
    }

    /// ベクトルをノードに追加
    pub async fn add_vector_to_node(&self, node_id: &str, vector: &[f32]) -> Result<()> {
        let vector_str = format!("[{}]", vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));

        sqlx::query(
            r#"
            UPDATE graph_nodes
            SET vector = $2::vector,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(node_id)
        .bind(&vector_str)
        .execute(&*self.pool)
        .await?;

        Ok(())
    }
}

/// グラフノード
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: Option<String>,
    pub label: String,
    pub properties: Value,
    pub vector: Option<Vec<f32>>,
    pub jsonld: Value,
}

/// グラフエッジ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: Option<String>,
    pub source: String,
    pub target: String,
    pub label: String,
    pub properties: Value,
}

/// ベクトル検索結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorSearchResult {
    pub node_id: String,
    pub score: f32,
    pub node: Option<GraphNode>,
}

