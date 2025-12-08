/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/operation-history
 * 
 * Operation history management for tracking all changes
 */
use crate::ports::postgres::PostgresPool;
use serde_json::Value;
use uuid::Uuid;
use sqlx::Row;

#[derive(Debug, Clone)]
pub enum OperationType {
    Create,
    Update,
    Delete,
    Reorder,
    GenerateImage,
}

impl OperationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationType::Create => "CREATE",
            OperationType::Update => "UPDATE",
            OperationType::Delete => "DELETE",
            OperationType::Reorder => "REORDER",
            OperationType::GenerateImage => "GENERATE_IMAGE",
        }
    }
}

pub struct HistoryService;

impl HistoryService {
    /// Save operation history
    pub async fn save_operation(
        pool: &PostgresPool,
        entity_type: &str,
        entity_id: Uuid,
        operation_type: OperationType,
        operation_data: Value,
        user_id: Option<Uuid>,
    ) -> Result<Uuid, sqlx::Error> {
        let id = Uuid::new_v4();
        
        sqlx::query(
            r#"
            INSERT INTO operation_history (id, entity_type, entity_id, operation_type, operation_data, user_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
            "#,
        )
        .bind(id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(operation_type.as_str())
        .bind(operation_data)
        .bind(user_id)
        .fetch_one(pool.as_ref())
        .await
        .map(|row: sqlx::postgres::PgRow| row.get("id"))
    }
}

