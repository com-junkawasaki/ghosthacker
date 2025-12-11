/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/storyboard-queries
 * 
 * GraphQL Query resolvers
 */
use async_graphql::{Context, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::schema::storyboard::{Project, Storyboard, Scene, VideoStatus, GeneratedImage, OperationHistory, Character, Dialogue, HumeVoice, CharacterAsset};
use crate::schema::composer::{Composer, AudioTrack, AudioClip, SunoMusic};
use crate::schema::scenario::{Scenario, Episode, Part, ScenePlan};
use crate::ports::hume_service::HumeService;
use crate::ports::clerk::get_clerk_auth_from_context;
use uuid::Uuid;
use sqlx::Row;

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Health check
    async fn health(&self) -> String {
        "ok".to_string()
    }

    /// List all projects (filtered by organization if authenticated)
    async fn projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        // Get organization context if available
        let org_filter = if let Ok(auth) = get_clerk_auth_from_context(ctx) {
            auth.org.map(|org| org.id)
        } else {
            None
        };
        
        let query = if let Some(org_id) = org_filter {
            sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
                r#"
                SELECT id, title, description, created_at, updated_at
                FROM storyboard_projects
                WHERE org_id = $1
                ORDER BY created_at DESC
                "#,
            )
            .bind(org_id)
        } else {
            // If no org context, return all projects (for backward compatibility or admin access)
            sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
                r#"
                SELECT id, title, description, created_at, updated_at
                FROM storyboard_projects
                ORDER BY created_at DESC
                "#,
            )
        };
        
        let rows = query
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

    /// List storyboards for a project (with organization access control)
    async fn storyboards(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Storyboard>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        // Check organization access - verify project belongs to user's organization
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
                
                // project_org is None if project doesn't exist, Some(None) if project exists but org_id is NULL
                match project_org {
                    None => {
                        // Project doesn't exist
                        return Err(async_graphql::Error::new("Project not found"));
                    }
                    Some(Some(project_org_id)) => {
                        // Project exists and has org_id
                        if project_org_id != org.id {
                            return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                        }
                    }
                    Some(None) => {
                        // Project exists but has no org_id - deny access for org-scoped requests
                        return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                    }
                }
            }
        }
        
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

    /// List characters for a project
    async fn characters(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Character>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
            FROM characters
            WHERE project_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(project_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch characters: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let project_id: Uuid = row.get("project_id");
            let profile_image_id: Option<Uuid> = row.get("profile_image_id");
            
            Character {
                id: ID(id.to_string()),
                project_id: ID(project_id.to_string()),
                name: row.get("name"),
                description: row.get("description"),
                personality: row.get("personality"),
                background: row.get("background"),
                default_hume_voice_id: row.get("default_hume_voice_id"),
                profile_image_id: profile_image_id.map(|id| ID(id.to_string())),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }

    /// List dialogues for a scene
    async fn dialogues(&self, ctx: &Context<'_>, scene_id: ID) -> Result<Vec<Dialogue>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scene_uuid = Uuid::parse_str(&scene_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scene ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
                   start_time_seconds::text, duration_seconds::text, order_index, created_at, updated_at
            FROM dialogues
            WHERE scene_id = $1
            ORDER BY order_index ASC, created_at ASC
            "#,
        )
        .bind(scene_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch dialogues: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let scene_id: Uuid = row.get("scene_id");
            let character_id: Uuid = row.get("character_id");
            let start_time_seconds: Option<String> = row.get("start_time_seconds");
            let duration_seconds: Option<String> = row.get("duration_seconds");
            let translated_text_json: Option<serde_json::Value> = row.get("translated_text");
            
            // Extract first translated text as string (simplified)
            let translated_text = translated_text_json
                .and_then(|v| v.as_object()?.values().next()?.as_str().map(|s| s.to_string()));
            
            Dialogue {
                id: ID(id.to_string()),
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
            }
        }).collect())
    }

    /// List available Hume AI voices
    async fn hume_voices(&self, _ctx: &Context<'_>) -> Result<Vec<HumeVoice>> {
        let hume_api_key = std::env::var("HUME_API_KEY")
            .map_err(|_| async_graphql::Error::new("HUME_API_KEY not configured"))?;
        let hume_service = HumeService::new(hume_api_key);
        
        let voices = hume_service.list_voices().await
            .map_err(|e| async_graphql::Error::new(format!("Failed to fetch Hume voices: {}", e)))?;
        
        Ok(voices.into_iter().map(|v| HumeVoice {
            id: v.id,
            name: v.name,
            description: v.description,
            language: v.language,
        }).collect())
    }

    /// Get audio data for a dialogue as base64 string
    async fn audio_data(&self, ctx: &Context<'_>, dialogue_id: ID) -> Result<String> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let dialogue_uuid = Uuid::parse_str(&dialogue_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid dialogue ID: {}", e)))?;
        
        let row = sqlx::query(
            r#"
            SELECT audio_data
            FROM dialogues
            WHERE id = $1 AND audio_data IS NOT NULL
            "#,
        )
        .bind(dialogue_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch audio data: {}", e)))?;
        
        let row = row.ok_or_else(|| async_graphql::Error::new("Audio data not found"))?;
        
        let audio_bytes: Vec<u8> = row.get("audio_data");
        use base64::Engine;
        let base64_data = base64::engine::general_purpose::STANDARD.encode(&audio_bytes);
        
        Ok(base64_data)
    }

    /// List character assets for a character
    async fn character_assets(&self, ctx: &Context<'_>, character_id: ID) -> Result<Vec<CharacterAsset>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let character_uuid = Uuid::parse_str(&character_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid character ID: {}", e)))?;
        
        let rows = sqlx::query(
            r#"
            SELECT id, character_id, asset_type, asset_format, created_at, updated_at
            FROM character_assets
            WHERE character_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(character_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch character assets: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let character_id: Uuid = row.get("character_id");
            
            CharacterAsset {
                id: ID(id.to_string()),
                character_id: ID(character_id.to_string()),
                asset_type: row.get("asset_type"),
                asset_format: row.get("asset_format"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }

    /// Get character asset data as base64 string
    async fn character_asset_data(&self, ctx: &Context<'_>, asset_id: ID) -> Result<String> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let asset_uuid = Uuid::parse_str(&asset_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid asset ID: {}", e)))?;
        
        let row = sqlx::query(
            r#"
            SELECT asset_data
            FROM character_assets
            WHERE id = $1
            "#,
        )
        .bind(asset_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch character asset: {}", e)))?;
        
        let row = row.ok_or_else(|| async_graphql::Error::new("Character asset not found"))?;
        
        let asset_bytes: Vec<u8> = row.get("asset_data");
        use base64::Engine;
        let base64_data = base64::engine::general_purpose::STANDARD.encode(&asset_bytes);
        
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
            
            let _entity_type_filter = entity_type.as_deref().unwrap_or("%");
            
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

    /// List composers for a project
    async fn composers(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Composer>> {
        crate::resolvers::composer::composers(ctx, project_id).await
    }

    /// Get a composer by ID
    async fn composer(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Composer>> {
        crate::resolvers::composer::composer(ctx, id).await
    }

    /// List audio tracks for a composer
    async fn audio_tracks(&self, ctx: &Context<'_>, composer_id: ID) -> Result<Vec<AudioTrack>> {
        crate::resolvers::composer::audio_tracks(ctx, composer_id).await
    }

    /// List audio clips for a track
    async fn audio_clips(&self, ctx: &Context<'_>, track_id: ID) -> Result<Vec<AudioClip>> {
        crate::resolvers::composer::audio_clips(ctx, track_id).await
    }

    /// List Suno music for a composer
    async fn suno_music(&self, ctx: &Context<'_>, composer_id: ID) -> Result<Vec<SunoMusic>> {
        crate::resolvers::composer::suno_music(ctx, composer_id).await
    }

    /// List scenarios for a project
    async fn scenarios(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Scenario>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        // Check organization access
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
                
                match project_org {
                    None => return Err(async_graphql::Error::new("Project not found")),
                    Some(Some(project_org_id)) => {
                        if project_org_id != org.id {
                            return Err(async_graphql::Error::new("Access denied"));
                        }
                    }
                    Some(None) => {
                        // Project exists but org_id is NULL - allow access for backward compatibility
                    }
                }
            }
        }
        
        let rows = sqlx::query(
            r#"
            SELECT id, project_id, title, description, created_at, updated_at
            FROM scenarios
            WHERE project_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(project_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scenarios: {}", e)))?;
        
        Ok(rows.into_iter().map(|row| {
            let id: Uuid = row.get("id");
            let project_id: Uuid = row.get("project_id");
            
            Scenario {
                id: ID(id.to_string()),
                project_id: ID(project_id.to_string()),
                title: row.get("title"),
                description: row.get("description"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }).collect())
    }

    /// Get a scenario by ID
    async fn scenario(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Scenario>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let scenario_uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid scenario ID: {}", e)))?;
        
        // Check organization access
        if let Ok(auth) = get_clerk_auth_from_context(ctx) {
            if let Some(org) = auth.org {
                let scenario_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
                    "SELECT org_id FROM scenarios WHERE id = $1"
                )
                .bind(scenario_uuid)
                .fetch_optional(pool.as_ref())
                .await
                .map_err(|e| async_graphql::Error::new(format!("Failed to verify scenario access: {}", e)))?;
                
                match scenario_org {
                    None => return Ok(None),
                    Some(Some(scenario_org_id)) => {
                        if scenario_org_id != org.id {
                            return Err(async_graphql::Error::new("Access denied"));
                        }
                    }
                    Some(None) => {
                        // Scenario exists but org_id is NULL - allow access
                    }
                }
            }
        }
        
        let row = sqlx::query(
            r#"
            SELECT id, project_id, title, description, created_at, updated_at
            FROM scenarios
            WHERE id = $1
            "#,
        )
        .bind(scenario_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch scenario: {}", e)))?;
        
        Ok(row.map(|row| {
            let id: Uuid = row.get("id");
            let project_id: Uuid = row.get("project_id");
            
            Scenario {
                id: ID(id.to_string()),
                project_id: ID(project_id.to_string()),
                title: row.get("title"),
                description: row.get("description"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        }))
    }
}
