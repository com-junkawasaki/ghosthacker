/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-schema-scenario
 * 
 * GraphQL schema types for Scenario Management
 */
use async_graphql::{SimpleObject, ComplexObject, Context, ID, Result};
use crate::ports::postgres::PostgresPool;
use uuid::Uuid;
use sqlx::Row;

#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct Scenario {
    pub id: ID,
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[ComplexObject]
impl Scenario {
    /// Get episodes for this scenario
    async fn episodes(&self, ctx: &Context<'_>) -> Result<Vec<Episode>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scenario_uuid = Uuid::parse_str(&self.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scenario ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, scenario_id, title, description, order_index, created_at, updated_at
            FROM episodes
            WHERE scenario_id = $1
            ORDER BY order_index ASC, created_at ASC
            "#,
        )
        .bind(scenario_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch episodes: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let scenario_id: Uuid = row.get("scenario_id");
            
            Episode {
                id: ID(id.to_string()),
                scenario_id: ID(scenario_id.to_string()),
                title: row.get("title"),
                description: row.get("description"),
                order_index: row.get("order_index"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }
}

#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct Episode {
    pub id: ID,
    #[graphql(name = "scenarioId")]
    pub scenario_id: ID,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: i32,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[ComplexObject]
impl Episode {
    /// Get parts for this episode
    async fn parts(&self, ctx: &Context<'_>) -> Result<Vec<Part>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let episode_uuid = Uuid::parse_str(&self.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid episode ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, episode_id, title, description, order_index, created_at, updated_at
            FROM parts
            WHERE episode_id = $1
            ORDER BY order_index ASC, created_at ASC
            "#,
        )
        .bind(episode_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch parts: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let episode_id: Uuid = row.get("episode_id");
            
            Part {
                id: ID(id.to_string()),
                episode_id: ID(episode_id.to_string()),
                title: row.get("title"),
                description: row.get("description"),
                order_index: row.get("order_index"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }
}

#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct Part {
    pub id: ID,
    #[graphql(name = "episodeId")]
    pub episode_id: ID,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: i32,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[ComplexObject]
impl Part {
    /// Get scene plans for this part
    async fn scene_plans(&self, ctx: &Context<'_>) -> Result<Vec<ScenePlan>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let part_uuid = Uuid::parse_str(&self.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid part ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, part_id, description, order_index, created_at, updated_at
            FROM scene_plans
            WHERE part_id = $1
            ORDER BY order_index ASC, created_at ASC
            "#,
        )
        .bind(part_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scene plans: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let part_id: Uuid = row.get("part_id");
            
            ScenePlan {
                id: ID(id.to_string()),
                part_id: ID(part_id.to_string()),
                description: row.get("description"),
                order_index: row.get("order_index"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }
}

#[derive(SimpleObject, Clone)]
pub struct ScenePlan {
    pub id: ID,
    #[graphql(name = "partId")]
    pub part_id: ID,
    pub description: String,
    #[graphql(name = "orderIndex")]
    pub order_index: i32,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}
