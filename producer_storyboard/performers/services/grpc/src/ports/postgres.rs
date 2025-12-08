/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:System
 * @id https://gftd.ai/performer/system/postgresql
 * 
 * PostgreSQL database connection and query implementation using sqlx
 */
use sqlx::PgPool;
use std::sync::Arc;

pub type PostgresPool = Arc<PgPool>;

/// Create PostgreSQL connection pool
pub async fn create_pool() -> anyhow::Result<PostgresPool> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string());
    
    let pool = PgPool::connect(&database_url).await?;
    
    Ok(Arc::new(pool))
}
