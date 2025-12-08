/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/storyboard-mutations
 * 
 * GraphQL Mutation resolvers
 */
use async_graphql::{Context, InputObject, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::ports::openai_service::{OpenAIService, ImageGenerationRequest};
use crate::ports::history::{HistoryService, OperationType};
use crate::schema::storyboard::{Project, VideoStatus, Scene, GeneratedImage};
use uuid::Uuid;
use serde_json::json;
use sqlx::Row;

#[derive(InputObject)]
pub struct CreateProjectInput {
    pub title: String,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct CreateSceneInput {
    #[graphql(name = "storyboardId")]
    pub storyboard_id: ID,
    #[graphql(name = "sceneNumber")]
    pub scene_number: i32,
    #[graphql(name = "textDescription")]
    pub text_description: Option<String>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "transitionType")]
    pub transition_type: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateSceneInput {
    pub id: ID,
    #[graphql(name = "textDescription")]
    pub text_description: Option<String>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "transitionType")]
    pub transition_type: Option<String>,
}

#[derive(InputObject)]
pub struct ReorderScenesInput {
    #[graphql(name = "storyboardId")]
    pub storyboard_id: ID,
    #[graphql(name = "sceneIds")]
    pub scene_ids: Vec<ID>,
}

#[derive(InputObject)]
pub struct GenerateSceneImageInput {
    #[graphql(name = "sceneId")]
    pub scene_id: ID,
    pub prompt: Option<String>,
    pub model: Option<String>,
}

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Create a new project
    async fn create_project(&self, ctx: &Context<'_>, input: CreateProjectInput) -> Result<Project> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO storyboard_projects (id, title, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            "#,
        )
        .bind(id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create project: {}", e)))?;
        
        Ok(Project {
            id: ID(id.to_string()),
            title: input.title,
            description: input.description,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Generate a video for a storyboard
    async fn generate_video(&self, ctx: &Context<'_>, storyboard_id: ID) -> Result<VideoStatus> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let storyboard_uuid = Uuid::parse_str(&storyboard_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid storyboard ID: {}", e)))?;
        
        // Get the next variation number
        let variation_row = sqlx::query_as::<_, (Option<i32>,)>(
            r#"
            SELECT MAX(variation_number) + 1
            FROM generated_videos
            WHERE storyboard_id = $1
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to get variation number: {}", e)))?;
        
        let variation_number = variation_row
            .and_then(|row| row.0)
            .unwrap_or(1);
        
        // Create a new video generation record
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO generated_videos (id, storyboard_id, variation_number, status, created_at, updated_at)
            VALUES ($1, $2, $3, 'pending', $4, $4)
            "#,
        )
        .bind(id)
        .bind(storyboard_uuid)
        .bind(variation_number)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create video generation record: {}", e)))?;
        
        Ok(VideoStatus {
            id: ID(id.to_string()),
            storyboard_id,
            variation_number,
            video_url: None,
            status: "pending".to_string(),
            error_message: None,
            created_at: now.to_rfc3339(),
        })
    }

    /// Create a new scene
    async fn create_scene(&self, ctx: &Context<'_>, input: CreateSceneInput) -> Result<Scene> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let storyboard_uuid = Uuid::parse_str(&input.storyboard_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid storyboard ID: {}", e)))?;
        
        // Check if the scene_number already exists for this storyboard
        let existing_scene = sqlx::query(
            r#"
            SELECT id FROM scenes
            WHERE storyboard_id = $1 AND scene_number = $2
            "#,
        )
        .bind(storyboard_uuid)
        .bind(input.scene_number)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to check existing scene: {}", e)))?;
        
        // If scene_number exists, shift existing scenes
        let scene_number = if existing_scene.is_some() {
            // Shift all scenes with scene_number >= input.scene_number
            sqlx::query(
                r#"
                UPDATE scenes
                SET scene_number = scene_number + 1, updated_at = NOW()
                WHERE storyboard_id = $1 AND scene_number >= $2
                "#,
            )
            .bind(storyboard_uuid)
            .bind(input.scene_number)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to shift scenes: {}", e)))?;
            
            input.scene_number
        } else {
            input.scene_number
        };
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        let duration: Option<rust_decimal::Decimal> = input.duration_seconds.and_then(|d| rust_decimal::Decimal::from_f64_retain(d));
        let start_time: Option<rust_decimal::Decimal> = input.start_time_seconds.and_then(|d| rust_decimal::Decimal::from_f64_retain(d));
        
        sqlx::query(
            r#"
            INSERT INTO scenes (id, storyboard_id, scene_number, text_description, start_time_seconds, duration_seconds, transition_type, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
            "#,
        )
        .bind(id)
        .bind(storyboard_uuid)
        .bind(scene_number)
        .bind(&input.text_description)
        .bind(start_time)
        .bind(duration)
        .bind(&input.transition_type)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create scene: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "scene",
            id,
            OperationType::Create,
            json!({
                "storyboard_id": input.storyboard_id.0,
                "scene_number": input.scene_number,
                "text_description": input.text_description,
            }),
            None,
        ).await;
        
        Ok(Scene {
            id: ID(id.to_string()),
            storyboard_id: input.storyboard_id,
            scene_number: input.scene_number,
            text_description: input.text_description,
            media_type: None,
            media_url: None,
            start_time_seconds: input.start_time_seconds,
            duration_seconds: input.duration_seconds,
            transition_type: input.transition_type,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Update a scene
    async fn update_scene(&self, ctx: &Context<'_>, input: UpdateSceneInput) -> Result<Scene> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&input.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        // Get current scene data for history
        let current_row = sqlx::query(
            r#"
            SELECT storyboard_id, scene_number, text_description, start_time_seconds::text, duration_seconds::text, transition_type
            FROM scenes
            WHERE id = $1
            "#,
        )
        .bind(scene_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scene: {}", e)))?;
        
        let current = current_row.ok_or_else(|| async_graphql::Error::new("Scene not found"))?;
        let storyboard_id: Uuid = current.get("storyboard_id");
        
        let duration: Option<rust_decimal::Decimal> = input.duration_seconds.and_then(|d| rust_decimal::Decimal::from_f64_retain(d));
        let start_time: Option<rust_decimal::Decimal> = input.start_time_seconds.and_then(|d| rust_decimal::Decimal::from_f64_retain(d));
        
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            UPDATE scenes
            SET text_description = COALESCE($1, text_description),
                start_time_seconds = COALESCE($2, start_time_seconds),
                duration_seconds = COALESCE($3, duration_seconds),
                transition_type = COALESCE($4, transition_type),
                updated_at = $5
            WHERE id = $6
            "#,
        )
        .bind(&input.text_description)
        .bind(start_time.as_ref())
        .bind(duration.as_ref())
        .bind(&input.transition_type)
        .bind(now)
        .bind(scene_uuid)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to update scene: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "scene",
            scene_uuid,
            OperationType::Update,
            json!({
                "before": {
                    "text_description": current.get::<Option<String>, _>("text_description"),
                    "duration_seconds": current.get::<Option<String>, _>("duration_seconds"),
                },
                "after": {
                    "text_description": input.text_description,
                    "duration_seconds": input.duration_seconds,
                },
            }),
            None,
        ).await;
        
        // Fetch updated scene
        let row = sqlx::query(
            r#"
            SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
                   start_time_seconds::text, duration_seconds::text, transition_type, created_at, updated_at
            FROM scenes
            WHERE id = $1
            "#,
        )
        .bind(scene_uuid)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated scene: {}", e)))?;
        
        let start_time_seconds: Option<String> = row.get("start_time_seconds");
        let duration_seconds: Option<String> = row.get("duration_seconds");
        
        Ok(Scene {
            id: input.id,
            storyboard_id: ID(storyboard_id.to_string()),
            scene_number: row.get("scene_number"),
            text_description: row.get("text_description"),
            media_type: row.get("media_type"),
            media_url: row.get("media_url"),
            start_time_seconds: start_time_seconds.and_then(|s| s.parse::<f64>().ok()),
            duration_seconds: duration_seconds.and_then(|s| s.parse::<f64>().ok()),
            transition_type: row.get("transition_type"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        })
    }

    /// Delete a scene
    async fn delete_scene(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        // Get scene data for history before deletion
        let scene_row = sqlx::query(
            r#"
            SELECT storyboard_id, scene_number, text_description
            FROM scenes
            WHERE id = $1
            "#,
        )
        .bind(scene_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scene: {}", e)))?;
        
        if let Some(row) = scene_row {
            sqlx::query("DELETE FROM scenes WHERE id = $1")
                .bind(scene_uuid)
                .execute(pool.as_ref())
                .await
                .map_err(|e| async_graphql::Error::new(format!("Failed to delete scene: {}", e)))?;
            
            // Save operation history
            let _ = HistoryService::save_operation(
                pool,
                "scene",
                scene_uuid,
                OperationType::Delete,
                json!({
                    "scene_number": row.get::<i32, _>("scene_number"),
                    "text_description": row.get::<Option<String>, _>("text_description"),
                }),
                None,
            ).await;
            
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Reorder scenes
    async fn reorder_scenes(&self, ctx: &Context<'_>, input: ReorderScenesInput) -> Result<Vec<Scene>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let storyboard_uuid = Uuid::parse_str(&input.storyboard_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid storyboard ID: {}", e)))?;
        
        // Use a transaction to avoid unique constraint violations
        let mut tx = pool.begin().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to start transaction: {}", e)))?;
        
        // First, set all scene numbers to negative values to avoid conflicts
        sqlx::query(
            r#"
            UPDATE scenes
            SET scene_number = -scene_number, updated_at = NOW()
            WHERE storyboard_id = $1
            "#,
        )
        .bind(storyboard_uuid)
        .execute(&mut *tx)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to prepare scenes for reordering: {}", e)))?;
        
        // Then update scene numbers based on new order
        for (index, scene_id) in input.scene_ids.iter().enumerate() {
            let scene_uuid = Uuid::parse_str(&scene_id.0)
                .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
            
            sqlx::query(
                r#"
                UPDATE scenes
                SET scene_number = $1, updated_at = NOW()
                WHERE id = $2 AND storyboard_id = $3
                "#,
            )
            .bind((index + 1) as i32)
            .bind(scene_uuid)
            .bind(storyboard_uuid)
            .execute(&mut *tx)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to reorder scenes: {}", e)))?;
        }
        
        // Commit the transaction
        tx.commit().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to commit transaction: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "storyboard",
            storyboard_uuid,
            OperationType::Reorder,
            json!({
                "scene_ids": input.scene_ids.iter().map(|id| id.0.as_str()).collect::<Vec<_>>(),
            }),
            None,
        ).await;
        
        // Fetch updated scenes
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
            let start_time_seconds: Option<String> = row.get("start_time_seconds");
            let duration_seconds: Option<String> = row.get("duration_seconds");
            
            Scene {
                id: ID(id.to_string()),
                storyboard_id: ID(storyboard_id.to_string()),
                scene_number: row.get("scene_number"),
                text_description: row.get("text_description"),
                media_type: row.get("media_type"),
                media_url: row.get("media_url"),
                start_time_seconds: start_time_seconds.and_then(|s| s.parse::<f64>().ok()),
                duration_seconds: duration_seconds.and_then(|s| s.parse::<f64>().ok()),
                transition_type: row.get("transition_type"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }

    /// Generate image for a scene using OpenAI DALL-E
    async fn generate_scene_image(&self, ctx: &Context<'_>, input: GenerateSceneImageInput) -> Result<GeneratedImage> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&input.scene_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        // Get scene data
        let scene_row = sqlx::query(
            r#"
            SELECT text_description
            FROM scenes
            WHERE id = $1
            "#,
        )
        .bind(scene_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scene: {}", e)))?;
        
        let scene = scene_row.ok_or_else(|| async_graphql::Error::new("Scene not found"))?;
        let text_description: Option<String> = scene.get("text_description");
        
        // Get OpenAI service from context or create new one
        let openai_api_key = std::env::var("OPENAI_API_KEY")
            .map_err(|_| async_graphql::Error::new("OPENAI_API_KEY not configured"))?;
        let openai_service = OpenAIService::new(openai_api_key);
        
        // Generate prompt from scene description or use provided prompt
        let prompt = input.prompt.unwrap_or_else(|| {
            text_description.unwrap_or_else(|| "A beautiful scene".to_string())
        });
        
        let model = input.model.clone().unwrap_or_else(|| "dall-e-3".to_string());
        
        // Generate image
        let image_request = ImageGenerationRequest {
            prompt: prompt.clone(),
            model: Some(model.clone()),
            size: Some("1024x1024".to_string()),
            quality: Some("standard".to_string()),
            n: Some(1),
        };
        
        let image_response = openai_service.generate_image(image_request).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to generate image: {}", e)))?;
        
        // Download image
        let image_bytes = openai_service.download_image(&image_response.image_url).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to download image: {}", e)))?;
        
        // Determine image format from URL or default to png
        let image_format = if image_response.image_url.contains(".png") {
            "png"
        } else if image_response.image_url.contains(".jpg") || image_response.image_url.contains(".jpeg") {
            "jpeg"
        } else {
            "png"
        };
        
        // Save image to database
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO generated_images (id, scene_id, image_data, image_format, prompt, model, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(id)
        .bind(scene_uuid)
        .bind(image_bytes)
        .bind(image_format)
        .bind(&prompt)
        .bind(&model)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to save image: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "scene",
            scene_uuid,
            OperationType::GenerateImage,
            json!({
                "image_id": id.to_string(),
                "prompt": prompt,
                "model": model,
            }),
            None,
        ).await;
        
        Ok(GeneratedImage {
            id: ID(id.to_string()),
            scene_id: input.scene_id,
            openai_image_id: None,
            image_format: Some(image_format.to_string()),
            prompt: Some(prompt),
            model: Some(model),
            created_at: now.to_rfc3339(),
        })
    }
}
