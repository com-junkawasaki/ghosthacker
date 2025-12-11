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
use crate::ports::clerk::{get_clerk_auth_from_context, require_auth_and_org};
use crate::schema::storyboard::{Project, Storyboard, VideoStatus, Scene, GeneratedImage, Character, Dialogue, CharacterAsset};
use crate::schema::composer::{Composer, AudioTrack, AudioClip, SunoMusic};
use crate::schema::scenario::{Scenario, Episode, Part, ScenePlan};
use crate::resolvers::composer::{CreateComposerInput, CreateAudioTrackInput, CreateAudioClipInput, GenerateSunoMusicInput, UpdateAudioClipInput};
use uuid::Uuid;
use serde_json::json;
use sqlx::Row;
use base64::{Engine as _, engine::general_purpose};

#[derive(InputObject)]
pub struct CreateProjectInput {
    pub title: String,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct CreateStoryboardInput {
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub title: Option<String>,
    #[graphql(name = "aspectRatio")]
    pub aspect_ratio: Option<String>,
    pub resolution: Option<String>,
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
pub struct UploadSceneImageInput {
    #[graphql(name = "sceneId")]
    pub scene_id: ID,
    #[graphql(name = "imageData")]
    pub image_data: String, // Base64 encoded image data
    #[graphql(name = "imageType")]
    pub image_type: Option<String>, // 'start', 'end', or 'uploaded'
    #[graphql(name = "imageFormat")]
    pub image_format: Option<String>, // 'png', 'jpeg', 'webp'
}

#[derive(InputObject)]
pub struct CreateCharacterInput {
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub name: String,
    pub description: Option<String>,
    pub personality: Option<String>,
    pub background: Option<String>,
    #[graphql(name = "defaultHumeVoiceId")]
    pub default_hume_voice_id: Option<String>,
    #[graphql(name = "profileImageId")]
    pub profile_image_id: Option<ID>,
}

#[derive(InputObject)]
pub struct UpdateCharacterInput {
    pub id: ID,
    pub name: Option<String>,
    pub description: Option<String>,
    pub personality: Option<String>,
    pub background: Option<String>,
    #[graphql(name = "defaultHumeVoiceId")]
    pub default_hume_voice_id: Option<String>,
    #[graphql(name = "profileImageId")]
    pub profile_image_id: Option<ID>,
}

#[derive(InputObject)]
pub struct UploadCharacterAssetInput {
    #[graphql(name = "characterId")]
    pub character_id: ID,
    #[graphql(name = "assetData")]
    pub asset_data: String, // Base64 encoded asset data
    #[graphql(name = "assetType")]
    pub asset_type: String, // 'image' or 'audio'
    #[graphql(name = "assetFormat")]
    pub asset_format: Option<String>, // 'png', 'jpeg', 'webp', 'mp3', 'wav', etc.
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
pub struct CreateScenarioInput {
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub title: String,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateScenarioInput {
    pub id: ID,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct CreateEpisodeInput {
    #[graphql(name = "scenarioId")]
    pub scenario_id: ID,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateEpisodeInput {
    pub id: ID,
    pub title: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct CreatePartInput {
    #[graphql(name = "episodeId")]
    pub episode_id: ID,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdatePartInput {
    pub id: ID,
    pub title: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct CreateScenePlanInput {
    #[graphql(name = "partId")]
    pub part_id: ID,
    pub description: String,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateScenePlanInput {
    pub id: ID,
    pub description: Option<String>,
    #[graphql(name = "orderIndex")]
    pub order_index: Option<i32>,
}

#[derive(InputObject)]
pub struct ReorderEpisodesInput {
    #[graphql(name = "scenarioId")]
    pub scenario_id: ID,
    #[graphql(name = "episodeIds")]
    pub episode_ids: Vec<ID>,
}

#[derive(InputObject)]
pub struct ReorderPartsInput {
    #[graphql(name = "episodeId")]
    pub episode_id: ID,
    #[graphql(name = "partIds")]
    pub part_ids: Vec<ID>,
}

#[derive(InputObject)]
pub struct ReorderScenePlansInput {
    #[graphql(name = "partId")]
    pub part_id: ID,
    #[graphql(name = "scenePlanIds")]
    pub scene_plan_ids: Vec<ID>,
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
    /// Create a new project (with organization scoping)
    async fn create_project(&self, ctx: &Context<'_>, input: CreateProjectInput) -> Result<Project> {
        let pool = ctx.data::<PostgresPool>()?;
        
        // Get organization context - require authentication and organization
        let org_id = if let Ok((_user, org)) = require_auth_and_org(ctx) {
            Some(org.id)
        } else {
            // Allow creation without org for backward compatibility, but log warning
            None
        };
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        if let Some(org_id_value) = org_id {
            sqlx::query(
                r#"
                INSERT INTO storyboard_projects (id, title, description, org_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $5)
                "#,
            )
            .bind(id)
            .bind(&input.title)
            .bind(&input.description)
            .bind(org_id_value)
            .bind(now)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to create project: {}", e)))?;
        } else {
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
        }
        
        Ok(Project {
            id: ID(id.to_string()),
            title: input.title,
            description: input.description,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Create a new storyboard (with organization access control)
    async fn create_storyboard(&self, ctx: &Context<'_>, input: CreateStoryboardInput) -> Result<Storyboard> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&input.project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        // Verify project exists and check organization access
        if let Ok(auth) = get_clerk_auth_from_context(ctx) {
            if let Some(org) = auth.org {
                // Verify project belongs to organization
                let project_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
                    "SELECT org_id FROM storyboard_projects WHERE id = $1"
                )
                .bind(project_uuid)
                .fetch_optional(pool.as_ref())
                .await
                .map_err(|e| async_graphql::Error::new(format!("Failed to verify project access: {}", e)))?;
                
                let project_org_id = project_org.flatten();
                
                if let Some(project_org_id) = project_org_id {
                    if project_org_id != org.id {
                        return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                    }
                } else {
                    // Project exists but has no org_id - deny access for org-scoped requests
                    return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                }
            }
        } else {
            // Fallback: just verify project exists
            let project_exists = sqlx::query_scalar::<_, bool>(
                r#"
                SELECT EXISTS(SELECT 1 FROM storyboard_projects WHERE id = $1)
                "#,
            )
            .bind(project_uuid)
            .fetch_one(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to verify project: {}", e)))?;
            
            if !project_exists {
                return Err(async_graphql::Error::new("Project not found"));
            }
        }
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        let title = input.title.unwrap_or_else(|| "New Storyboard".to_string());
        let aspect_ratio = input.aspect_ratio.unwrap_or_else(|| "16:9".to_string());
        let resolution = input.resolution.unwrap_or_else(|| "1920x1080".to_string());
        
        sqlx::query(
            r#"
            INSERT INTO storyboards (id, project_id, title, aspect_ratio, resolution, num_variations, storyboard_data, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
            "#,
        )
        .bind(id)
        .bind(project_uuid)
        .bind(&title)
        .bind(&aspect_ratio)
        .bind(&resolution)
        .bind(1i32) // num_variations default
        .bind(json!({})) // storyboard_data default empty object
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create storyboard: {}", e)))?;
        
        Ok(Storyboard {
            id: ID(id.to_string()),
            project_id: input.project_id,
            title,
            aspect_ratio,
            resolution,
            duration_seconds: None,
            num_variations: 1,
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
        // For DALL-E image generation, we need OpenAI direct API key (not OpenRouter key)
        // Check for OPENAI_DIRECT_API_KEY first, fallback to OPENAI_API_KEY
        let openai_api_key = std::env::var("OPENAI_DIRECT_API_KEY")
            .or_else(|_| std::env::var("OPENAI_API_KEY"))
            .map_err(|_| async_graphql::Error::new("OPENAI_API_KEY or OPENAI_DIRECT_API_KEY not configured. For DALL-E image generation, please set OPENAI_DIRECT_API_KEY with a direct OpenAI API key (not OpenRouter key)."))?;
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
        
        println!("[GraphQL Mutation] Image generation successful. Image URL: {}", 
            if image_response.image_url.len() > 100 {
                format!("{}...", &image_response.image_url[..100])
            } else {
                image_response.image_url.clone()
            }
        );
        
        // Download image (handles both HTTP URLs and base64 data URLs)
        println!("[GraphQL Mutation] Downloading/decoding image...");
        let image_bytes = openai_service.download_image(&image_response.image_url).await
            .map_err(|e| {
                println!("[GraphQL Mutation] Failed to download/decode image: {}", e);
                async_graphql::Error::new(format!("Failed to download image: {}", e))
            })?;
        
        println!("[GraphQL Mutation] Image downloaded/decoded successfully ({} bytes)", image_bytes.len());
        
        // Determine image format from URL or data URL MIME type
        let image_format = if image_response.image_url.starts_with("data:image/") {
            // Extract format from data URL MIME type
            if image_response.image_url.contains("data:image/png") {
                "png"
            } else if image_response.image_url.contains("data:image/jpeg") || image_response.image_url.contains("data:image/jpg") {
                "jpeg"
            } else if image_response.image_url.contains("data:image/webp") {
                "webp"
            } else {
                "png" // Default for data URLs
            }
        } else if image_response.image_url.contains(".png") {
            "png"
        } else if image_response.image_url.contains(".jpg") || image_response.image_url.contains(".jpeg") {
            "jpeg"
        } else if image_response.image_url.contains(".webp") {
            "webp"
        } else {
            "png" // Default
        };
        
        println!("[GraphQL Mutation] Determined image format: {}", image_format);
        
        // Save image to database FIRST (before returning response)
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        println!("[GraphQL Mutation] Saving image to PostgreSQL (BYTEA)...");
        
        sqlx::query(
            r#"
            INSERT INTO generated_images (id, scene_id, image_data, image_format, image_type, prompt, model, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(id)
        .bind(scene_uuid)
        .bind(&image_bytes)
        .bind(image_format)
        .bind(image_type)
        .bind(&prompt)
        .bind(&model)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| {
            println!("[GraphQL Mutation] Failed to save image to database: {}", e);
            async_graphql::Error::new(format!("Failed to save image to database: {}", e))
        })?;
        
        println!("[GraphQL Mutation] Image saved to PostgreSQL successfully (ID: {})", id);
        
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
                "image_format": image_format,
                "image_size_bytes": image_bytes.len(),
            }),
            None,
        ).await;
        
        println!("[GraphQL Mutation] Image generation completed successfully");
        
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

    /// Upload an image for a scene
    async fn upload_scene_image(&self, ctx: &Context<'_>, input: UploadSceneImageInput) -> Result<GeneratedImage> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&input.scene_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        // Verify scene exists
        let scene_exists = sqlx::query(
            r#"
            SELECT id FROM scenes WHERE id = $1
            "#,
        )
        .bind(scene_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify scene: {}", e)))?;
        
        if scene_exists.is_none() {
            return Err(async_graphql::Error::new("Scene not found"));
        }
        
        // Decode base64 image data
        let image_bytes = general_purpose::STANDARD.decode(&input.image_data)
            .map_err(|e| async_graphql::Error::new(format!("Failed to decode base64 image data: {}", e)))?;
        
        // Determine image format from input or detect from data
        let image_format = input.image_format.unwrap_or_else(|| {
            // Try to detect format from base64 data prefix or default to png
            if input.image_data.starts_with("data:image/") {
                if input.image_data.contains("data:image/png") {
                    "png".to_string()
                } else if input.image_data.contains("data:image/jpeg") || input.image_data.contains("data:image/jpg") {
                    "jpeg".to_string()
                } else if input.image_data.contains("data:image/webp") {
                    "webp".to_string()
                } else {
                    "png".to_string()
                }
            } else {
                "png".to_string() // Default
            }
        });
        
        // Clean base64 data (remove data URL prefix if present)
        let clean_image_data = if input.image_data.starts_with("data:") {
            if let Some(base64_part) = input.image_data.split(',').nth(1) {
                general_purpose::STANDARD.decode(base64_part)
                    .map_err(|e| async_graphql::Error::new(format!("Failed to decode base64 image data: {}", e)))?
            } else {
                image_bytes
            }
        } else {
            image_bytes
        };
        
        // Determine image type (default to 'uploaded')
        let image_type = input.image_type.as_deref().unwrap_or("uploaded");
        
        println!("[GraphQL Mutation] upload_scene_image: Uploading image");
        println!("[GraphQL Mutation] Scene ID: {}", scene_uuid);
        println!("[GraphQL Mutation] Image type: {}", image_type);
        println!("[GraphQL Mutation] Image format: {}", image_format);
        println!("[GraphQL Mutation] Image size: {} bytes", clean_image_data.len());
        
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
        .bind(clean_image_data)
        .bind(&image_format)
        .bind(image_type)
        .bind(None::<String>) // No prompt for uploaded images
        .bind(None::<String>) // No model for uploaded images
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to save uploaded image: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "scene",
            scene_uuid,
            OperationType::GenerateImage,
            json!({
                "image_id": id.to_string(),
                "image_type": image_type,
                "image_format": image_format.clone(),
                "source": "upload",
            }),
            None,
        ).await;
        
        Ok(GeneratedImage {
            id: ID(id.to_string()),
            scene_id: input.scene_id,
            openai_image_id: None,
            image_format: Some(image_format.to_string()),
            image_type: Some(image_type.to_string()),
            prompt: None,
            model: None,
            created_at: now.to_rfc3339(),
        })
    }

    /// Create a new character
    async fn create_character(&self, ctx: &Context<'_>, input: CreateCharacterInput) -> Result<Character> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&input.project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        let profile_image_uuid = input.profile_image_id.as_ref()
            .and_then(|id| Uuid::parse_str(&id.0).ok());
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO characters (id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
            "#,
        )
        .bind(id)
        .bind(project_uuid)
        .bind(&input.name)
        .bind(&input.description)
        .bind(&input.personality)
        .bind(&input.background)
        .bind(&input.default_hume_voice_id)
        .bind(profile_image_uuid)
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
                "personality": input.personality,
                "background": input.background,
                "default_hume_voice_id": input.default_hume_voice_id,
            }),
            None,
        ).await;
        
        Ok(Character {
            id: ID(id.to_string()),
            project_id: input.project_id,
            name: input.name,
            description: input.description,
            personality: input.personality,
            background: input.background,
            default_hume_voice_id: input.default_hume_voice_id,
            profile_image_id: input.profile_image_id,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Update a character
    async fn update_character(&self, ctx: &Context<'_>, input: UpdateCharacterInput) -> Result<Character> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let character_uuid = Uuid::parse_str(&input.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid character ID: {}", e)))?;
        
        let profile_image_uuid = input.profile_image_id.as_ref()
            .and_then(|id| Uuid::parse_str(&id.0).ok());
        
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
        
        if let Some(ref personality) = input.personality {
            sqlx::query(
                r#"
                UPDATE characters
                SET personality = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(personality)
            .bind(character_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update character personality: {}", e)))?;
        }
        
        if let Some(ref background) = input.background {
            sqlx::query(
                r#"
                UPDATE characters
                SET background = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(background)
            .bind(character_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update character background: {}", e)))?;
        }
        
        if let Some(ref default_hume_voice_id) = input.default_hume_voice_id {
            sqlx::query(
                r#"
                UPDATE characters
                SET default_hume_voice_id = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(default_hume_voice_id)
            .bind(character_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update character default_hume_voice_id: {}", e)))?;
        }
        
        if input.profile_image_id.is_some() {
            sqlx::query(
                r#"
                UPDATE characters
                SET profile_image_id = $1, updated_at = NOW()
                WHERE id = $2
                "#,
            )
            .bind(profile_image_uuid)
            .bind(character_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to update character profile_image_id: {}", e)))?;
        }
        
        if input.name.is_none() && input.description.is_none() && input.personality.is_none() 
            && input.background.is_none() && input.default_hume_voice_id.is_none() && input.profile_image_id.is_none() {
            return Err(async_graphql::Error::new("No fields to update"));
        }
        
        // Fetch updated character
        let row = sqlx::query(
            r#"
            SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
            FROM characters
            WHERE id = $1
            "#,
        )
        .bind(character_uuid)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated character: {}", e)))?;
        
        let project_id: Uuid = row.get("project_id");
        let profile_image_id: Option<Uuid> = row.get("profile_image_id");
        
        Ok(Character {
            id: input.id,
            project_id: ID(project_id.to_string()),
            name: row.get("name"),
            description: row.get("description"),
            personality: row.get("personality"),
            background: row.get("background"),
            default_hume_voice_id: row.get("default_hume_voice_id"),
            profile_image_id: profile_image_id.map(|id| ID(id.to_string())),
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

    /// Upload a character asset (image or audio)
    async fn upload_character_asset(&self, ctx: &Context<'_>, input: UploadCharacterAssetInput) -> Result<CharacterAsset> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let character_uuid = Uuid::parse_str(&input.character_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid character ID: {}", e)))?;
        
        // Validate asset type
        if input.asset_type != "image" && input.asset_type != "audio" {
            return Err(async_graphql::Error::new("assetType must be 'image' or 'audio'"));
        }
        
        // Decode base64 data
        let asset_bytes = if input.asset_data.starts_with("data:") {
            // Handle data URL format (data:image/png;base64,...)
            let parts: Vec<&str> = input.asset_data.splitn(2, ',').collect();
            if parts.len() < 2 {
                return Err(async_graphql::Error::new("Invalid base64 data URL format"));
            }
            general_purpose::STANDARD.decode(parts[1])
                .map_err(|e| async_graphql::Error::new(format!("Failed to decode base64 data: {}", e)))?
        } else {
            // Handle plain base64 string
            general_purpose::STANDARD.decode(&input.asset_data)
                .map_err(|e| async_graphql::Error::new(format!("Failed to decode base64 data: {}", e)))?
        };
        
        // Detect asset format from MIME type or use provided format
        let asset_format = if let Some(format) = input.asset_format {
            format
        } else if input.asset_data.starts_with("data:") {
            let mime_part = input.asset_data.splitn(2, ',').next().unwrap_or("");
            if mime_part.contains("image/png") {
                "png".to_string()
            } else if mime_part.contains("image/jpeg") || mime_part.contains("image/jpg") {
                "jpeg".to_string()
            } else if mime_part.contains("image/webp") {
                "webp".to_string()
            } else if mime_part.contains("audio/mpeg") || mime_part.contains("audio/mp3") {
                "mp3".to_string()
            } else if mime_part.contains("audio/wav") || mime_part.contains("audio/wave") {
                "wav".to_string()
            } else {
                "unknown".to_string()
            }
        } else {
            "unknown".to_string()
        };
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        // Insert asset into database
        sqlx::query(
            r#"
            INSERT INTO character_assets (id, character_id, asset_type, asset_data, asset_format, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            "#,
        )
        .bind(id)
        .bind(character_uuid)
        .bind(&input.asset_type)
        .bind(asset_bytes)
        .bind(&asset_format)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to save character asset: {}", e)))?;
        
        // Save operation history
        let _ = HistoryService::save_operation(
            pool,
            "character_asset",
            id,
            OperationType::Create,
            json!({
                "character_id": input.character_id.0,
                "asset_type": input.asset_type,
                "asset_format": asset_format,
            }),
            None,
        ).await;
        
        Ok(CharacterAsset {
            id: ID(id.to_string()),
            character_id: input.character_id,
            asset_type: input.asset_type,
            asset_format: Some(asset_format),
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Delete a character asset
    async fn delete_character_asset(&self, ctx: &Context<'_>, asset_id: ID) -> Result<bool> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let asset_uuid = Uuid::parse_str(&asset_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid asset ID: {}", e)))?;
        
        // Get asset data for history before deletion
        let asset_row = sqlx::query(
            r#"
            SELECT character_id, asset_type
            FROM character_assets
            WHERE id = $1
            "#,
        )
        .bind(asset_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch character asset: {}", e)))?;
        
        if let Some(_row) = asset_row {
            sqlx::query("DELETE FROM character_assets WHERE id = $1")
                .bind(asset_uuid)
                .execute(pool.as_ref())
                .await
                .map_err(|e| async_graphql::Error::new(format!("Failed to delete character asset: {}", e)))?;
            
            // Save operation history
            let _ = HistoryService::save_operation(
                pool,
                "character_asset",
                asset_uuid,
                OperationType::Delete,
                json!({
                    "asset_id": asset_id.0,
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

    /// Create a new composer
    async fn create_composer(&self, ctx: &Context<'_>, input: CreateComposerInput) -> Result<Composer> {
        crate::resolvers::composer::create_composer(ctx, input).await
    }

    /// Create a new audio track
    async fn create_audio_track(&self, ctx: &Context<'_>, input: CreateAudioTrackInput) -> Result<AudioTrack> {
        crate::resolvers::composer::create_audio_track(ctx, input).await
    }

    /// Create a new audio clip
    async fn create_audio_clip(&self, ctx: &Context<'_>, input: CreateAudioClipInput) -> Result<AudioClip> {
        crate::resolvers::composer::create_audio_clip(ctx, input).await
    }

    /// Update an audio clip
    async fn update_audio_clip(&self, ctx: &Context<'_>, input: UpdateAudioClipInput) -> Result<AudioClip> {
        crate::resolvers::composer::update_audio_clip(ctx, input).await
    }

    /// Delete an audio clip
    async fn delete_audio_clip(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        crate::resolvers::composer::delete_audio_clip(ctx, id).await
    }

    /// Generate music using Suno AI
    async fn generate_suno_music(&self, ctx: &Context<'_>, input: GenerateSunoMusicInput) -> Result<SunoMusic> {
        crate::resolvers::composer::generate_suno_music(ctx, input).await
    }

    /// Reorder audio clips on a track
    async fn reorder_audio_clips(&self, ctx: &Context<'_>, track_id: ID, clip_ids: Vec<ID>) -> Result<Vec<AudioClip>> {
        crate::resolvers::composer::reorder_audio_clips(ctx, track_id, clip_ids).await
    }

    /// Create a new scenario
    async fn create_scenario(&self, ctx: &Context<'_>, input: CreateScenarioInput) -> Result<Scenario> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let project_uuid = Uuid::parse_str(&input.project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        // Verify project belongs to organization
        let project_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM storyboard_projects WHERE id = $1"
        )
        .bind(project_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify project access: {}", e)))?;
        
        match project_org {
            None => return Err(async_graphql::Error::new("Project not found")),
            Some(Some(project_org_id)) => {
                if project_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {
                // Project exists but org_id is NULL - allow access and set org_id
                sqlx::query("UPDATE storyboard_projects SET org_id = $1 WHERE id = $2")
                    .bind(&org.id)
                    .bind(project_uuid)
                    .execute(pool.as_ref())
                    .await
                    .map_err(|e| async_graphql::Error::new(format!("Failed to update project org_id: {}", e)))?;
            }
        }
        
        let scenario_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO scenarios (id, project_id, org_id, title, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(scenario_id)
        .bind(project_uuid)
        .bind(&org.id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(now)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create scenario: {}", e)))?;
        
        Ok(Scenario {
            id: ID(scenario_id.to_string()),
            project_id: input.project_id,
            title: input.title,
            description: input.description,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Update a scenario
    async fn update_scenario(&self, ctx: &Context<'_>, input: UpdateScenarioInput) -> Result<Scenario> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let scenario_uuid = Uuid::parse_str(&input.id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scenario ID: {}", e)))?;
        
        // Verify scenario belongs to organization
        let scenario_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM scenarios WHERE id = $1"
        )
        .bind(scenario_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify scenario access: {}", e)))?;
        
        match scenario_org {
            None => return Err(async_graphql::Error::new("Scenario not found")),
            Some(Some(scenario_org_id)) => {
                if scenario_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {
                // Scenario exists but org_id is NULL - allow access
            }
        }
        
        // For simplicity, use a fixed query structure
        let row = if input.title.is_some() && input.description.is_some() {
            sqlx::query(
                r#"
                UPDATE scenarios
                SET title = $1, description = $2, updated_at = NOW()
                WHERE id = $3
                RETURNING id, project_id, title, description, created_at, updated_at
                "#,
            )
            .bind(&input.title.as_ref().unwrap())
            .bind(&input.description.as_ref().unwrap())
            .bind(scenario_uuid)
            .fetch_one(pool.as_ref())
            .await
        } else if input.title.is_some() {
            sqlx::query(
                r#"
                UPDATE scenarios
                SET title = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id, project_id, title, description, created_at, updated_at
                "#,
            )
            .bind(&input.title.as_ref().unwrap())
            .bind(scenario_uuid)
            .fetch_one(pool.as_ref())
            .await
        } else {
            sqlx::query(
                r#"
                UPDATE scenarios
                SET description = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING id, project_id, title, description, created_at, updated_at
                "#,
            )
            .bind(&input.description.as_ref().unwrap())
            .bind(scenario_uuid)
            .fetch_one(pool.as_ref())
            .await
        }
        .map_err(|e| async_graphql::Error::new(format!("Failed to update scenario: {}", e)))?;
        
        let id: Uuid = row.get("id");
        let project_id: Uuid = row.get("project_id");
        
        Ok(Scenario {
            id: ID(id.to_string()),
            project_id: ID(project_id.to_string()),
            title: row.get("title"),
            description: row.get("description"),
            created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
            updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
        })
    }

    /// Delete a scenario
    async fn delete_scenario(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let scenario_uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scenario ID: {}", e)))?;
        
        // Verify scenario belongs to organization
        let scenario_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM scenarios WHERE id = $1"
        )
        .bind(scenario_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify scenario access: {}", e)))?;
        
        match scenario_org {
            None => return Err(async_graphql::Error::new("Scenario not found")),
            Some(Some(scenario_org_id)) => {
                if scenario_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {
                // Scenario exists but org_id is NULL - allow access
            }
        }
        
        let result = sqlx::query("DELETE FROM scenarios WHERE id = $1")
            .bind(scenario_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to delete scenario: {}", e)))?;
        
        Ok(result.rows_affected() > 0)
    }

    /// Create an episode
    async fn create_episode(&self, ctx: &Context<'_>, input: CreateEpisodeInput) -> Result<Episode> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let scenario_uuid = Uuid::parse_str(&input.scenario_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scenario ID: {}", e)))?;
        
        // Verify scenario belongs to organization
        let scenario_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM scenarios WHERE id = $1"
        )
        .bind(scenario_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify scenario access: {}", e)))?;
        
        match scenario_org {
            None => return Err(async_graphql::Error::new("Scenario not found")),
            Some(Some(scenario_org_id)) => {
                if scenario_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {}
        }
        
        // Get max order_index if not provided
        let order_index = if let Some(order) = input.order_index {
            order
        } else {
            let max_order: Option<i32> = sqlx::query_scalar(
                "SELECT COALESCE(MAX(order_index), -1) + 1 FROM episodes WHERE scenario_id = $1"
            )
            .bind(scenario_uuid)
            .fetch_one(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get max order_index: {}", e)))?;
            max_order.unwrap_or(0)
        };
        
        let episode_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO episodes (id, scenario_id, org_id, title, description, order_index, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(episode_id)
        .bind(scenario_uuid)
        .bind(&org.id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(order_index)
        .bind(now)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create episode: {}", e)))?;
        
        Ok(Episode {
            id: ID(episode_id.to_string()),
            scenario_id: input.scenario_id,
            title: input.title,
            description: input.description,
            order_index,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Create a part
    async fn create_part(&self, ctx: &Context<'_>, input: CreatePartInput) -> Result<Part> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let episode_uuid = Uuid::parse_str(&input.episode_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid episode ID: {}", e)))?;
        
        // Verify episode belongs to organization
        let episode_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM episodes WHERE id = $1"
        )
        .bind(episode_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify episode access: {}", e)))?;
        
        match episode_org {
            None => return Err(async_graphql::Error::new("Episode not found")),
            Some(Some(episode_org_id)) => {
                if episode_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {}
        }
        
        // Get max order_index if not provided
        let order_index = if let Some(order) = input.order_index {
            order
        } else {
            let max_order: Option<i32> = sqlx::query_scalar(
                "SELECT COALESCE(MAX(order_index), -1) + 1 FROM parts WHERE episode_id = $1"
            )
            .bind(episode_uuid)
            .fetch_one(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get max order_index: {}", e)))?;
            max_order.unwrap_or(0)
        };
        
        let part_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO parts (id, episode_id, org_id, title, description, order_index, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(part_id)
        .bind(episode_uuid)
        .bind(&org.id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(order_index)
        .bind(now)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create part: {}", e)))?;
        
        Ok(Part {
            id: ID(part_id.to_string()),
            episode_id: input.episode_id,
            title: input.title,
            description: input.description,
            order_index,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Create a scene plan
    async fn create_scene_plan(&self, ctx: &Context<'_>, input: CreateScenePlanInput) -> Result<ScenePlan> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let part_uuid = Uuid::parse_str(&input.part_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid part ID: {}", e)))?;
        
        // Verify part belongs to organization
        let part_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM parts WHERE id = $1"
        )
        .bind(part_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify part access: {}", e)))?;
        
        match part_org {
            None => return Err(async_graphql::Error::new("Part not found")),
            Some(Some(part_org_id)) => {
                if part_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {}
        }
        
        // Get max order_index if not provided
        let order_index = if let Some(order) = input.order_index {
            order
        } else {
            let max_order: Option<i32> = sqlx::query_scalar(
                "SELECT COALESCE(MAX(order_index), -1) + 1 FROM scene_plans WHERE part_id = $1"
            )
            .bind(part_uuid)
            .fetch_one(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to get max order_index: {}", e)))?;
            max_order.unwrap_or(0)
        };
        
        let scene_plan_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO scene_plans (id, part_id, org_id, description, order_index, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(scene_plan_id)
        .bind(part_uuid)
        .bind(&org.id)
        .bind(&input.description)
        .bind(order_index)
        .bind(now)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create scene plan: {}", e)))?;
        
        Ok(ScenePlan {
            id: ID(scene_plan_id.to_string()),
            part_id: input.part_id,
            description: input.description,
            order_index,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Reorder episodes within a scenario
    async fn reorder_episodes(&self, ctx: &Context<'_>, input: ReorderEpisodesInput) -> Result<Vec<Episode>> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let scenario_uuid = Uuid::parse_str(&input.scenario_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scenario ID: {}", e)))?;
        
        // Verify scenario belongs to organization
        let scenario_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM scenarios WHERE id = $1"
        )
        .bind(scenario_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify scenario access: {}", e)))?;
        
        match scenario_org {
            None => return Err(async_graphql::Error::new("Scenario not found")),
            Some(Some(scenario_org_id)) => {
                if scenario_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {}
        }
        
        // Use a transaction to avoid unique constraint violations
        let mut tx = pool.begin().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to start transaction: {}", e)))?;
        
        // First, set all order_index values to negative to avoid conflicts
        sqlx::query(
            r#"
            UPDATE episodes
            SET order_index = -order_index - 10000, updated_at = NOW()
            WHERE scenario_id = $1
            "#,
        )
        .bind(scenario_uuid)
        .execute(&mut *tx)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to prepare episodes for reordering: {}", e)))?;
        
        // Then update order_index based on new order
        for (index, episode_id) in input.episode_ids.iter().enumerate() {
            let episode_uuid = Uuid::parse_str(&episode_id.0)
                .map_err(|e| async_graphql::Error::new(format!("Invalid episode ID: {}", e)))?;
            
            sqlx::query(
                r#"
                UPDATE episodes
                SET order_index = $1, updated_at = NOW()
                WHERE id = $2 AND scenario_id = $3
                "#,
            )
            .bind(index as i32)
            .bind(episode_uuid)
            .bind(scenario_uuid)
            .execute(&mut *tx)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to reorder episodes: {}", e)))?;
        }
        
        // Commit the transaction
        tx.commit().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to commit transaction: {}", e)))?;
        
        // Fetch updated episodes
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

    /// Reorder parts within an episode
    async fn reorder_parts(&self, ctx: &Context<'_>, input: ReorderPartsInput) -> Result<Vec<Part>> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let episode_uuid = Uuid::parse_str(&input.episode_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid episode ID: {}", e)))?;
        
        // Verify episode belongs to organization
        let episode_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM episodes WHERE id = $1"
        )
        .bind(episode_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify episode access: {}", e)))?;
        
        match episode_org {
            None => return Err(async_graphql::Error::new("Episode not found")),
            Some(Some(episode_org_id)) => {
                if episode_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {}
        }
        
        // Use a transaction to avoid unique constraint violations
        let mut tx = pool.begin().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to start transaction: {}", e)))?;
        
        // First, set all order_index values to negative to avoid conflicts
        sqlx::query(
            r#"
            UPDATE parts
            SET order_index = -order_index - 10000, updated_at = NOW()
            WHERE episode_id = $1
            "#,
        )
        .bind(episode_uuid)
        .execute(&mut *tx)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to prepare parts for reordering: {}", e)))?;
        
        // Then update order_index based on new order
        for (index, part_id) in input.part_ids.iter().enumerate() {
            let part_uuid = Uuid::parse_str(&part_id.0)
                .map_err(|e| async_graphql::Error::new(format!("Invalid part ID: {}", e)))?;
            
            sqlx::query(
                r#"
                UPDATE parts
                SET order_index = $1, updated_at = NOW()
                WHERE id = $2 AND episode_id = $3
                "#,
            )
            .bind(index as i32)
            .bind(part_uuid)
            .bind(episode_uuid)
            .execute(&mut *tx)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to reorder parts: {}", e)))?;
        }
        
        // Commit the transaction
        tx.commit().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to commit transaction: {}", e)))?;
        
        // Fetch updated parts
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

    /// Reorder scene plans within a part
    async fn reorder_scene_plans(&self, ctx: &Context<'_>, input: ReorderScenePlansInput) -> Result<Vec<ScenePlan>> {
        let pool = ctx.data::<PostgresPool>()?;
        let (_user, org) = require_auth_and_org(ctx)?;
        
        let part_uuid = Uuid::parse_str(&input.part_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid part ID: {}", e)))?;
        
        // Verify part belongs to organization
        let part_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT org_id FROM parts WHERE id = $1"
        )
        .bind(part_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to verify part access: {}", e)))?;
        
        match part_org {
            None => return Err(async_graphql::Error::new("Part not found")),
            Some(Some(part_org_id)) => {
                if part_org_id != org.id {
                    return Err(async_graphql::Error::new("Access denied"));
                }
            }
            Some(None) => {}
        }
        
        // Use a transaction to avoid unique constraint violations
        let mut tx = pool.begin().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to start transaction: {}", e)))?;
        
        // First, set all order_index values to negative to avoid conflicts
        sqlx::query(
            r#"
            UPDATE scene_plans
            SET order_index = -order_index - 10000, updated_at = NOW()
            WHERE part_id = $1
            "#,
        )
        .bind(part_uuid)
        .execute(&mut *tx)
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to prepare scene plans for reordering: {}", e)))?;
        
        // Then update order_index based on new order
        for (index, scene_plan_id) in input.scene_plan_ids.iter().enumerate() {
            let scene_plan_uuid = Uuid::parse_str(&scene_plan_id.0)
                .map_err(|e| async_graphql::Error::new(format!("Invalid scene plan ID: {}", e)))?;
            
            sqlx::query(
                r#"
                UPDATE scene_plans
                SET order_index = $1, updated_at = NOW()
                WHERE id = $2 AND part_id = $3
                "#,
            )
            .bind(index as i32)
            .bind(scene_plan_uuid)
            .bind(part_uuid)
            .execute(&mut *tx)
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to reorder scene plans: {}", e)))?;
        }
        
        // Commit the transaction
        tx.commit().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to commit transaction: {}", e)))?;
        
        // Fetch updated scene plans
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
