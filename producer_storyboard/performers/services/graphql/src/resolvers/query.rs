/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/storyboard-queries
 * 
 * GraphQL Query resolvers
 */
use async_graphql::{Context, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::schema::storyboard::{Project, Storyboard, Scene, VideoStatus};
use uuid::Uuid;
use rust_decimal::prelude::*;
use sqlx::Row;

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Health check
    async fn health(&self) -> String {
        "ok".to_string()
    }

    /// List all projects
    async fn projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM storyboard_projects
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch projects: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| Project {
            id: ID(row.0.to_string()),
            title: row.1,
            description: row.2,
            created_at: row.3.to_rfc3339(),
            updated_at: row.4.to_rfc3339(),
        }).collect())
    }

    /// List storyboards for a project
    async fn storyboards(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Storyboard>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        let rows = sqlx::query_as::<_, (Uuid, Uuid, String, String, String, Option<i32>, i32, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at
            FROM storyboards
            WHERE project_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(project_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch storyboards: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| Storyboard {
            id: ID(row.0.to_string()),
            project_id: ID(row.1.to_string()),
            title: row.2,
            aspect_ratio: row.3,
            resolution: row.4,
            duration_seconds: row.5,
            num_variations: row.6,
            created_at: row.7.to_rfc3339(),
            updated_at: row.8.to_rfc3339(),
        }).collect())
    }

    /// List scenes for a storyboard
    async fn scenes(&self, ctx: &Context<'_>, storyboard_id: ID) -> Result<Vec<Scene>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let storyboard_uuid = Uuid::parse_str(&storyboard_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid storyboard ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
                   start_time_seconds::text, duration_seconds::text, transition_type, created_at, updated_at
            FROM scenes
            WHERE storyboard_id = $1
            ORDER BY scene_number ASC
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scenes: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let storyboard_id: Uuid = row.get("storyboard_id");
            let scene_number: i32 = row.get("scene_number");
            let text_description: Option<String> = row.get("text_description");
            let media_type: Option<String> = row.get("media_type");
            let media_url: Option<String> = row.get("media_url");
            let start_time_seconds: Option<f64> = row.try_get::<Option<String>, _>("start_time_seconds").ok().flatten().and_then(|s| s.parse::<f64>().ok());
            let duration_seconds: Option<f64> = row.try_get::<Option<String>, _>("duration_seconds").ok().flatten().and_then(|s| s.parse::<f64>().ok());
            let transition_type: Option<String> = row.get("transition_type");
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
            let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
            
            Scene {
                id: ID(id.to_string()),
                storyboard_id: ID(storyboard_id.to_string()),
                scene_number,
                text_description,
                media_type,
                media_url,
                start_time_seconds,
                duration_seconds,
                transition_type,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }).collect())
    }

    /// Get a single scene by ID
    async fn scene(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Scene>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        let row = sqlx::query(
            r#"
            SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
                   start_time_seconds::text, duration_seconds::text, transition_type, created_at, updated_at
            FROM scenes
            WHERE id = $1
            "#,
        )
        .bind(scene_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scene: {}", e)))?;
        
        Ok(row.map(|row| {
            let id: Uuid = row.get("id");
            let storyboard_id: Uuid = row.get("storyboard_id");
            let scene_number: i32 = row.get("scene_number");
            let text_description: Option<String> = row.get("text_description");
            let media_type: Option<String> = row.get("media_type");
            let media_url: Option<String> = row.get("media_url");
            let start_time_seconds: Option<f64> = row.try_get::<Option<String>, _>("start_time_seconds").ok().flatten().and_then(|s| s.parse::<f64>().ok());
            let duration_seconds: Option<f64> = row.try_get::<Option<String>, _>("duration_seconds").ok().flatten().and_then(|s| s.parse::<f64>().ok());
            let transition_type: Option<String> = row.get("transition_type");
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
            let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
            
            Scene {
                id: ID(id.to_string()),
                storyboard_id: ID(storyboard_id.to_string()),
                scene_number,
                text_description,
                media_type,
                media_url,
                start_time_seconds,
                duration_seconds,
                transition_type,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            }
        }))
    }

    /// List generated videos for a storyboard
    async fn generated_videos(&self, ctx: &Context<'_>, storyboard_id: ID) -> Result<Vec<VideoStatus>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let storyboard_uuid = Uuid::parse_str(&storyboard_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid storyboard ID: {}", e)))?;
        
        let rows = sqlx::query_as::<_, (Uuid, Uuid, i32, Option<String>, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, storyboard_id, variation_number, video_url, status, error_message, created_at
            FROM generated_videos
            WHERE storyboard_id = $1
            ORDER BY variation_number ASC, created_at DESC
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch generated videos: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| VideoStatus {
            id: ID(row.0.to_string()),
            storyboard_id: ID(row.1.to_string()),
            variation_number: row.2,
            video_url: row.3,
            status: row.4,
            error_message: row.5,
            created_at: row.6.to_rfc3339(),
        }).collect())
    }
}
