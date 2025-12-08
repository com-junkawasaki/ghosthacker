/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/storyboard-queries
 * 
 * GraphQL Query resolvers
 */
use async_graphql::{Context, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::schema::storyboard::{Project, Storyboard, Scene, VideoStatus, GeneratedImage, OperationHistory};
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

    /// List generated images for a scene
    async fn generated_images(&self, ctx: &Context<'_>, scene_id: ID) -> Result<Vec<GeneratedImage>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&scene_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, scene_id, openai_image_id, image_format, image_type, prompt, model, created_at
            FROM generated_images
            WHERE scene_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(scene_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch generated images: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let scene_id: Uuid = row.get("scene_id");
            
            GeneratedImage {
                id: ID(id.to_string()),
                scene_id: ID(scene_id.to_string()),
                openai_image_id: row.get("openai_image_id"),
                image_format: row.get("image_format"),
                image_type: row.get("image_type"),
                prompt: row.get("prompt"),
                model: row.get("model"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            }
        }).collect())
    }

    /// Get image data as base64 string
    async fn image_data(&self, ctx: &Context<'_>, image_id: ID) -> Result<String> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let image_uuid = Uuid::parse_str(&image_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid image ID: {}", e)))?;
        
        let row = sqlx::query(
            r#"
            SELECT image_data, image_format
            FROM generated_images
            WHERE id = $1
            "#,
        )
        .bind(image_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch image: {}", e)))?;
        
        let row = row.ok_or_else(|| async_graphql::Error::new("Image not found"))?;
        
        let image_bytes: Vec<u8> = row.get("image_data");
        use base64::Engine;
        let base64_data = base64::engine::general_purpose::STANDARD.encode(&image_bytes);
        
        Ok(base64_data)
    }

    /// List operation history
    async fn operation_history(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
        entity_id: Option<ID>,
    ) -> Result<Vec<OperationHistory>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let rows = if let Some(entity_id) = entity_id {
            let entity_uuid = Uuid::parse_str(&entity_id.0)
                .map_err(|e| async_graphql::Error::new(format!("Invalid entity ID: {}", e)))?;
            
            let entity_type_filter = entity_type.as_deref().unwrap_or("%");
            
            sqlx::query(
                r#"
                SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
                FROM operation_history
                WHERE entity_id = $1 AND ($2::text IS NULL OR entity_type = $2)
                ORDER BY created_at DESC
                LIMIT 100
                "#,
            )
            .bind(entity_uuid)
            .bind(entity_type)
            .fetch_all(pool.as_ref())
            .await
        } else if let Some(entity_type) = entity_type {
            sqlx::query(
                r#"
                SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
                FROM operation_history
                WHERE entity_type = $1
                ORDER BY created_at DESC
                LIMIT 100
                "#,
            )
            .bind(entity_type)
            .fetch_all(pool.as_ref())
            .await
        } else {
            sqlx::query(
                r#"
                SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
                FROM operation_history
                ORDER BY created_at DESC
                LIMIT 100
                "#,
            )
            .fetch_all(pool.as_ref())
            .await
        }
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch operation history: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let entity_id: Uuid = row.get("entity_id");
            let user_id: Option<Uuid> = row.get("user_id");
            let operation_data: serde_json::Value = row.get("operation_data");
            
            OperationHistory {
                id: ID(id.to_string()),
                entity_type: row.get("entity_type"),
                entity_id: ID(entity_id.to_string()),
                operation_type: row.get("operation_type"),
                operation_data: operation_data.to_string(),
                user_id: user_id.map(|u| ID(u.to_string())),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            }
        }).collect())
    }
}
