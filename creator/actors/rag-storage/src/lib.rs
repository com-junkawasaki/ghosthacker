//! PostgreSQL Storage Integration for Unified IR
//! 
//! Functions for saving/loading IR entities and relations,
//! querying by embedding, and graph traversal

use anyhow::{Context, Result};
use serde_json::Value;
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use std::env;

/// PostgreSQL storage client
pub struct StorageClient {
    pool: PgPool,
}

impl StorageClient {
    /// Create a new storage client
    /// 
    /// Reads DATABASE_URL from environment variable
    pub async fn new() -> Result<Self> {
        let database_url = env::var("DATABASE_URL")
            .context("DATABASE_URL environment variable not set")?;
        
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(&database_url)
            .await
            .context("Failed to connect to database")?;
        
        Ok(Self { pool })
    }
    
    /// Create with custom pool
    pub fn with_pool(pool: PgPool) -> Self {
        Self { pool }
    }
}

/// Save JSON-LD entity to database
pub async fn save_ir_entity(
    client: &StorageClient,
    entity_id: &str,
    entity_type: &str,
    jsonld_data: &Value,
    document_id: Option<uuid::Uuid>,
) -> Result<uuid::Uuid> {
    let doc_id = sqlx::query_scalar::<_, uuid::Uuid>(
        "SELECT save_ir_entity($1, $2, $3, $4)"
    )
    .bind(entity_id)
    .bind(entity_type)
    .bind(jsonld_data.to_string())
    .bind(document_id)
    .fetch_one(&client.pool)
    .await
    .context("Failed to save IR entity")?;
    
    Ok(doc_id)
}

/// Load IR entity from database
pub async fn load_ir_entity(
    client: &StorageClient,
    entity_id: &str,
) -> Result<Value> {
    let jsonld_str: String = sqlx::query_scalar(
        "SELECT load_ir_entity($1)"
    )
    .bind(entity_id)
    .fetch_one(&client.pool)
    .await
    .context("Failed to load IR entity")?;
    
    let jsonld: Value = serde_json::from_str(&jsonld_str)
        .context("Failed to parse JSON-LD")?;
    
    Ok(jsonld)
}

/// Query entities by embedding similarity
pub async fn query_by_embedding(
    client: &StorageClient,
    query_vector: &[f32],
    collection_id: Option<uuid::Uuid>,
    limit: i32,
    threshold: f64,
) -> Result<Vec<Value>> {
    // Convert f32 vector to PostgreSQL vector format
    let vector_str = format!("[{}]", query_vector.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(","));
    
    let rows = sqlx::query(
        "SELECT * FROM find_similar_chunks($1::vector(1536), $2, $3, $4, 'text-embedding-ada-002')"
    )
    .bind(&vector_str)
    .bind(collection_id)
    .bind(limit)
    .bind(threshold)
    .fetch_all(&client.pool)
    .await
    .context("Failed to query by embedding")?;
    
    // Convert rows to JSON-LD entities
    let mut entities = Vec::new();
    for row in rows {
        let entity_id: String = row.try_get("chunk_id")?;
        // Load full entity
        let entity = load_ir_entity(client, &entity_id).await?;
        entities.push(entity);
    }
    
    Ok(entities)
}

/// Query graph by relation type
pub async fn query_graph(
    client: &StorageClient,
    entity_id: &str,
    relation_type: &str,
) -> Result<Vec<Value>> {
    let rows = sqlx::query(
        "SELECT * FROM query_graph($1, $2)"
    )
    .bind(entity_id)
    .bind(relation_type)
    .fetch_all(&client.pool)
    .await
    .context("Failed to query graph")?;
    
    // Convert to relation objects
    let mut relations = Vec::new();
    for row in rows {
        let relation = serde_json::json!({
            "from": {
                "@id": row.try_get::<String, _>("from_entity_id")?,
                "@type": row.try_get::<String, _>("from_entity_type")?,
                "name": row.try_get::<Option<String>, _>("from_name")?,
            },
            "relationType": row.try_get::<String, _>("relation_type")?,
            "to": {
                "@id": row.try_get::<String, _>("to_entity_id")?,
                "@type": row.try_get::<String, _>("to_entity_type")?,
                "name": row.try_get::<Option<String>, _>("to_name")?,
            },
            "strength": row.try_get::<Option<f64>, _>("strength")?,
        });
        relations.push(relation);
    }
    
    Ok(relations)
}

/// Find related entities (graph traversal)
pub async fn find_related_entities(
    client: &StorageClient,
    entity_id: &str,
    relation_type: Option<&str>,
    max_depth: i32,
) -> Result<Vec<Value>> {
    let rows = sqlx::query(
        "SELECT * FROM find_related_entities($1, $2, $3)"
    )
    .bind(entity_id)
    .bind(relation_type)
    .bind(max_depth)
    .fetch_all(&client.pool)
    .await
    .context("Failed to find related entities")?;
    
    let mut entities = Vec::new();
    for row in rows {
        let e_id: String = row.try_get("entity_id")?;
        let entity = load_ir_entity(client, &e_id).await?;
        entities.push(entity);
    }
    
    Ok(entities)
}

/// Save IR relation
pub async fn save_ir_relation(
    client: &StorageClient,
    relation_id: &str,
    relation_type: &str,
    from_entity_id: &str,
    to_entity_id: &str,
    jsonld_data: &Value,
    scene_id: Option<&str>,
    strength: Option<f64>,
) -> Result<String> {
    sqlx::query_scalar::<_, String>(
        "SELECT save_ir_relation($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(relation_id)
    .bind(relation_type)
    .bind(from_entity_id)
    .bind(to_entity_id)
    .bind(jsonld_data.to_string())
    .bind(scene_id)
    .bind(strength)
    .fetch_one(&client.pool)
    .await
    .context("Failed to save IR relation")?;
    
    Ok(relation_id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires database
    async fn test_save_load_entity() {
        let client = StorageClient::new().await.unwrap();
        let jsonld = serde_json::json!({
            "@id": "test:entity",
            "@type": "Character",
            "name": "Test Character"
        });
        let doc_id = save_ir_entity(&client, "test:entity", "Character", &jsonld, None).await.unwrap();
        let loaded = load_ir_entity(&client, "test:entity").await.unwrap();
        assert_eq!(loaded["@id"], "test:entity");
    }
}
