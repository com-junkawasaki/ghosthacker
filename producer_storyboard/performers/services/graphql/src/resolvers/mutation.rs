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
use crate::ports::hume_service::HumeService;
use crate::ports::translation_service::TranslationService;
use crate::schema::storyboard::{Project, VideoStatus, Scene, GeneratedImage, Character, Dialogue};
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
    #[graphql(name = "imageType")]
    pub image_type: Option<String>,
}

#[derive(InputObject)]
pub struct CreateCharacterInput {
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub name: String,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateCharacterInput {
    pub id: ID,
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct CreateDialogueInput {
    #[graphql(name = "sceneId")]
    pub scene_id: ID,
    #[graphql(name = "characterId")]
    pub character_id: ID,
    pub language: String,
    pub text: String,
    #[graphql(name = "humeVoiceId")]
    pub hume_voice_id: Option<String>,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateDialogueInput {
    pub id: ID,
    pub language: Option<String>,
    pub text: Option<String>,
    #[graphql(name = "humeVoiceId")]
    pub hume_voice_id: Option<String>,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct TranslateDialogueInput {
    #[graphql(name = "dialogueId")]
    pub dialogue_id: ID,
    #[graphql(name = "targetLanguage")]
    pub target_language: String,
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
        
        // Determine image type (start or end)
        let image_type = input.image_type.as_deref().unwrap_or("start");
        if image_type != "start" && image_type != "end" {
            return Err(async_graphql::Error::new("imageType must be 'start' or 'end'"));
        }
        
        // Generate prompt from scene description or use provided prompt
        let base_prompt = input.prompt.unwrap_or_else(|| {
            text_description.unwrap_or_else(|| "A beautiful scene".to_string())
        });
        
        // Modify prompt based on image type
        let prompt = if image_type == "end" {
            format!("{} - Final frame, conclusion, ending moment", base_prompt)
        } else {
            format!("{} - Opening frame, beginning, starting moment", base_prompt)
        };
        
        let model = input.model.clone().unwrap_or_else(|| "dall-e-3".to_string());
        
        // Generate image
        let image_request = ImageGenerationRequest {
            prompt: prompt.clone(),
            model: Some(model.clone()),
            size: Some("1024x1024".to_string()),
            quality: Some("standard".to_string()),
            n: Some(1),
        };
        
        println!("[GraphQL Mutation] generate_scene_image: Starting image generation");
        println!("[GraphQL Mutation] Scene ID: {}", scene_uuid);
        println!("[GraphQL Mutation] Image type: {}", image_type);
        println!("[GraphQL Mutation] Prompt: {}", prompt);
        println!("[GraphQL Mutation] Model: {}", model);
        
        let image_response = openai_service.generate_image(image_request).await
            .map_err(|e| {
                println!("[GraphQL Mutation] Image generation failed: {}", e);
                async_graphql::Error::new(format!("Failed to generate image: {}", e))
            })?;
        
        println!("[GraphQL Mutation] Image generation successful. Image URL: {}", image_response.image_url);
        
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
            INSERT INTO generated_images (id, scene_id, image_data, image_format, image_type, prompt, model, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(id)
        .bind(scene_uuid)
        .bind(image_bytes)
        .bind(image_format)
        .bind(image_type)
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
                "image_type": image_type,
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
            image_type: Some(image_type.to_string()),
            prompt: Some(prompt),
            model: Some(model),
            created_at: now.to_rfc3339(),
        })
    }

    /// Create a new character
    async fn create_character(&self, ctx: &Context<'_>, input: CreateCharacterInput) -> Result<Character> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&input.project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO characters (id, project_id, name, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $5)
            "#,
        )
        .bind(id)
        .bind(project_uuid)
        .bind(&input.name)
        .bind(&input.description)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create character: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "character",
            id,
            OperationType::Create,
            json!({
                "project_id": input.project_id.0,
                "name": input.name,
                "description": input.description,
            }),
            None,
        ).await;
        
        Ok(Character {
            id: ID(id.to_string()),
            project_id: input.project_id,
            name: input.name,
            description: input.description,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Update a character
    async fn update_character(&self, ctx: &Context<'_>, input: UpdateCharacterInput) -> Result<Character> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let character_uuid = Uuid::parse_str(&input.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid character ID: {}", e)))?;
        
        // Update fields individually
        if let Some(ref name) = input.name {
            sqlx::query(
                r#"
                UPDATE characters
                SET name = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(name)
            .bind(character_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update character name: {}", e)))?;
        }
        
        if input.description.is_some() {
            sqlx::query(
                r#"
                UPDATE characters
                SET description = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(&input.description)
            .bind(character_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update character description: {}", e)))?;
        }
        
        if input.name.is_none() && input.description.is_none() {
            return Err(async_graphql::Error::new("No fields to update"));
        }
        
        // Fetch updated character
        let row = sqlx::query(
            r#"
            SELECT id, project_id, name, description, created_at, updated_at
            FROM characters
            WHERE id = $1
            "#,
        )
        .bind(character_uuid)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated character: {}", e)))?;
        
        let project_id: Uuid = row.get("project_id");
        
        Ok(Character {
            id: input.id,
            project_id: ID(project_id.to_string()),
            name: row.get("name"),
            description: row.get("description"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        })
    }

    /// Delete a character
    async fn delete_character(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let character_uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid character ID: {}", e)))?;
        
        // Get character data for history before deletion
        let character_row = sqlx::query(
            r#"
            SELECT project_id, name
            FROM characters
            WHERE id = $1
            "#,
        )
        .bind(character_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch character: {}", e)))?;
        
        if let Some(_row) = character_row {
            sqlx::query("DELETE FROM characters WHERE id = $1")
                .bind(character_uuid)
                .execute(pool.as_ref())
                .await
                .map_err(|e| async_graphql::Error::new(format!("Failed to delete character: {}", e)))?;
            
            // Save operation history
            let _ = HistoryService::save_operation(
                pool,
                "character",
                character_uuid,
                OperationType::Delete,
                json!({
                    "character_id": id.0,
                }),
                None,
            ).await;
            
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Create a new dialogue
    async fn create_dialogue(&self, ctx: &Context<'_>, input: CreateDialogueInput) -> Result<Dialogue> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&input.scene_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        let character_uuid = Uuid::parse_str(&input.character_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid character ID: {}", e)))?;
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        let order_index = input.order_index.unwrap_or(0);
        
        let start_time: Option<rust_decimal::Decimal> = input.start_time_seconds.and_then(|d| rust_decimal::Decimal::from_f64_retain(d));
        let duration: Option<rust_decimal::Decimal> = input.duration_seconds.and_then(|d| rust_decimal::Decimal::from_f64_retain(d));
        
        sqlx::query(
            r#"
            INSERT INTO dialogues (id, scene_id, character_id, language, text, hume_voice_id, start_time_seconds, duration_seconds, order_index, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
            "#,
        )
        .bind(id)
        .bind(scene_uuid)
        .bind(character_uuid)
        .bind(&input.language)
        .bind(&input.text)
        .bind(&input.hume_voice_id)
        .bind(start_time)
        .bind(duration)
        .bind(order_index)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create dialogue: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "dialogue",
            id,
            OperationType::Create,
            json!({
                "scene_id": input.scene_id.0,
                "character_id": input.character_id.0,
                "language": input.language,
                "text": input.text,
            }),
            None,
        ).await;
        
        Ok(Dialogue {
            id: ID(id.to_string()),
            scene_id: input.scene_id,
            character_id: input.character_id,
            language: input.language,
            text: input.text,
            translated_text: None,
            hume_voice_id: input.hume_voice_id,
            audio_url: None,
            start_time_seconds: input.start_time_seconds,
            duration_seconds: input.duration_seconds,
            order_index,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Update a dialogue
    async fn update_dialogue(&self, ctx: &Context<'_>, input: UpdateDialogueInput) -> Result<Dialogue> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let dialogue_uuid = Uuid::parse_str(&input.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid dialogue ID: {}", e)))?;
        
        // Update fields individually
        if let Some(ref language) = input.language {
            sqlx::query(
                r#"
                UPDATE dialogues
                SET language = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(language)
            .bind(dialogue_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue language: {}", e)))?;
        }
        
        if let Some(ref text) = input.text {
            sqlx::query(
                r#"
                UPDATE dialogues
                SET text = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(text)
            .bind(dialogue_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue text: {}", e)))?;
        }
        
        if input.hume_voice_id.is_some() {
            sqlx::query(
                r#"
                UPDATE dialogues
                SET hume_voice_id = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(&input.hume_voice_id)
            .bind(dialogue_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue voice: {}", e)))?;
        }
        
        if let Some(start_time) = input.start_time_seconds {
            let start_time_decimal = rust_decimal::Decimal::from_f64_retain(start_time);
            sqlx::query(
                r#"
                UPDATE dialogues
                SET start_time_seconds = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(start_time_decimal)
            .bind(dialogue_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue start time: {}", e)))?;
        }
        
        if let Some(duration) = input.duration_seconds {
            let duration_decimal = rust_decimal::Decimal::from_f64_retain(duration);
            sqlx::query(
                r#"
                UPDATE dialogues
                SET duration_seconds = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(duration_decimal)
            .bind(dialogue_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue duration: {}", e)))?;
        }
        
        if let Some(order_index) = input.order_index {
            sqlx::query(
                r#"
                UPDATE dialogues
                SET order_index = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(order_index)
            .bind(dialogue_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue order: {}", e)))?;
        }
        
        if input.language.is_none() && input.text.is_none() && input.hume_voice_id.is_none() 
            && input.start_time_seconds.is_none() && input.duration_seconds.is_none() && input.order_index.is_none() {
            return Err(async_graphql::Error::new("No fields to update"));
        }
        
        // Fetch updated dialogue
        let row = sqlx::query(
            r#"
            SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
                   start_time_seconds::text, duration_seconds::text, order_index, created_at, updated_at
            FROM dialogues
            WHERE id = $1
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated dialogue: {}", e)))?;
        
        let scene_id: Uuid = row.get("scene_id");
        let character_id: Uuid = row.get("character_id");
        let start_time_seconds: Option<String> = row.get("start_time_seconds");
        let duration_seconds: Option<String> = row.get("duration_seconds");
        let translated_text_json: Option<serde_json::Value> = row.get("translated_text");
        
        // Extract translated text as string (simplified - could be more sophisticated)
        let translated_text = translated_text_json
            .and_then(|v| v.as_object()?.values().next()?.as_str().map(|s| s.to_string()));
        
        Ok(Dialogue {
            id: input.id,
            scene_id: ID(scene_id.to_string()),
            character_id: ID(character_id.to_string()),
            language: row.get("language"),
            text: row.get("text"),
            translated_text,
            hume_voice_id: row.get("hume_voice_id"),
            audio_url: row.get("audio_url"),
            start_time_seconds: start_time_seconds.and_then(|s| s.parse::<f64>().ok()),
            duration_seconds: duration_seconds.and_then(|s| s.parse::<f64>().ok()),
            order_index: row.get("order_index"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        })
    }

    /// Delete a dialogue
    async fn delete_dialogue(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let dialogue_uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid dialogue ID: {}", e)))?;
        
        // Get dialogue data for history before deletion
        let dialogue_row = sqlx::query(
            r#"
            SELECT scene_id, character_id, text
            FROM dialogues
            WHERE id = $1
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch dialogue: {}", e)))?;
        
        if let Some(_row) = dialogue_row {
            sqlx::query("DELETE FROM dialogues WHERE id = $1")
                .bind(dialogue_uuid)
                .execute(pool.as_ref())
                .await
                .map_err(|e| async_graphql::Error::new(format!("Failed to delete dialogue: {}", e)))?;
            
            // Save operation history
            let _ = HistoryService::save_operation(
                pool,
                "dialogue",
                dialogue_uuid,
                OperationType::Delete,
                json!({
                    "dialogue_id": id.0,
                }),
                None,
            ).await;
            
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Translate a dialogue to target language
    async fn translate_dialogue(&self, ctx: &Context<'_>, input: TranslateDialogueInput) -> Result<Dialogue> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let dialogue_uuid = Uuid::parse_str(&input.dialogue_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid dialogue ID: {}", e)))?;
        
        // Get dialogue
        let row = sqlx::query(
            r#"
            SELECT id, scene_id, character_id, language, text, translated_text
            FROM dialogues
            WHERE id = $1
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch dialogue: {}", e)))?;
        
        let row = row.ok_or_else(|| async_graphql::Error::new("Dialogue not found"))?;
        
        let source_language: String = row.get("language");
        let text: String = row.get("text");
        
        if source_language == input.target_language {
            return Err(async_graphql::Error::new("Source and target languages are the same"));
        }
        
        // Get OpenAI API key
        let openai_api_key = std::env::var("OPENAI_API_KEY")
            .map_err(|_| async_graphql::Error::new("OPENAI_API_KEY not configured"))?;
        let translation_service = TranslationService::new(openai_api_key);
        
        // Translate text
        let translated_text = translation_service.translate_text(
            &text,
            &source_language,
            &input.target_language,
        ).await
        .map_err(|e| async_graphql::Error::new(format!("Translation failed: {}", e)))?;
        
        // Update translated_text JSONB field
        let mut translated_json: serde_json::Value = row.get("translated_text");
        if translated_json.is_null() {
            translated_json = json!({});
        }
        
        if let Some(obj) = translated_json.as_object_mut() {
            obj.insert(input.target_language.clone(), json!(translated_text));
        }
        
        sqlx::query(
            r#"
            UPDATE dialogues
            SET translated_text = $1, updated_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(&translated_json)
        .bind(dialogue_uuid)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to update dialogue translation: {}", e)))?;
        
        // Fetch updated dialogue
        let updated_row = sqlx::query(
            r#"
            SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
                   start_time_seconds::text, duration_seconds::text, order_index, created_at, updated_at
            FROM dialogues
            WHERE id = $1
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated dialogue: {}", e)))?;
        
        let scene_id: Uuid = updated_row.get("scene_id");
        let character_id: Uuid = updated_row.get("character_id");
        let start_time_seconds: Option<String> = updated_row.get("start_time_seconds");
        let duration_seconds: Option<String> = updated_row.get("duration_seconds");
        let translated_text_json: Option<serde_json::Value> = updated_row.get("translated_text");
        
        let translated_text_str = translated_text_json
            .and_then(|v| v.as_object()?.get(&input.target_language)?.as_str().map(|s| s.to_string()));
        
        Ok(Dialogue {
            id: input.dialogue_id,
            scene_id: ID(scene_id.to_string()),
            character_id: ID(character_id.to_string()),
            language: updated_row.get("language"),
            text: updated_row.get("text"),
            translated_text: translated_text_str,
            hume_voice_id: updated_row.get("hume_voice_id"),
            audio_url: updated_row.get("audio_url"),
            start_time_seconds: start_time_seconds.and_then(|s| s.parse::<f64>().ok()),
            duration_seconds: duration_seconds.and_then(|s| s.parse::<f64>().ok()),
            order_index: updated_row.get("order_index"),
            created_at: updated_row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: updated_row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        })
    }

    /// Generate audio for a dialogue using Hume AI
    async fn generate_dialogue_audio(&self, ctx: &Context<'_>, dialogue_id: ID) -> Result<Dialogue> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let dialogue_uuid = Uuid::parse_str(&dialogue_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid dialogue ID: {}", e)))?;
        
        // Get dialogue
        let row = sqlx::query(
            r#"
            SELECT id, scene_id, character_id, language, text, hume_voice_id
            FROM dialogues
            WHERE id = $1
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch dialogue: {}", e)))?;
        
        let row = row.ok_or_else(|| async_graphql::Error::new("Dialogue not found"))?;
        
        let text: String = row.get("text");
        let language: String = row.get("language");
        let hume_voice_id: Option<String> = row.get("hume_voice_id");
        
        let voice_id = hume_voice_id.ok_or_else(|| async_graphql::Error::new("Hume voice ID is required"))?;
        
        // Get Hume API key
        let hume_api_key = std::env::var("HUME_API_KEY")
            .map_err(|_| async_graphql::Error::new("HUME_API_KEY not configured"))?;
        let hume_service = HumeService::new(hume_api_key);
        
        // Generate speech
        let audio_data = hume_service.generate_speech(
            &text,
            &voice_id,
            Some(&language),
        ).await
        .map_err(|e| async_graphql::Error::new(format!("Failed to generate speech: {}", e)))?;
        
        // Save audio data
        sqlx::query(
            r#"
            UPDATE dialogues
            SET audio_data = $1, updated_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(audio_data)
        .bind(dialogue_uuid)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to save audio data: {}", e)))?;
        
        // Fetch updated dialogue
        let updated_row = sqlx::query(
            r#"
            SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
                   start_time_seconds::text, duration_seconds::text, order_index, created_at, updated_at
            FROM dialogues
            WHERE id = $1
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated dialogue: {}", e)))?;
        
        let scene_id: Uuid = updated_row.get("scene_id");
        let character_id: Uuid = updated_row.get("character_id");
        let start_time_seconds: Option<String> = updated_row.get("start_time_seconds");
        let duration_seconds: Option<String> = updated_row.get("duration_seconds");
        let translated_text_json: Option<serde_json::Value> = updated_row.get("translated_text");
        
        let translated_text = translated_text_json
            .and_then(|v| v.as_object()?.values().next()?.as_str().map(|s| s.to_string()));
        
        Ok(Dialogue {
            id: dialogue_id,
            scene_id: ID(scene_id.to_string()),
            character_id: ID(character_id.to_string()),
            language: updated_row.get("language"),
            text: updated_row.get("text"),
            translated_text,
            hume_voice_id: updated_row.get("hume_voice_id"),
            audio_url: updated_row.get("audio_url"),
            start_time_seconds: start_time_seconds.and_then(|s| s.parse::<f64>().ok()),
            duration_seconds: duration_seconds.and_then(|s| s.parse::<f64>().ok()),
            order_index: updated_row.get("order_index"),
            created_at: updated_row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: updated_row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        })
    }
}
