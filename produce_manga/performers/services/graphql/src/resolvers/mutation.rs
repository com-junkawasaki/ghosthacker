/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manga-mutations
 * 
 * GraphQL Mutation resolvers
 */
use async_graphql::{Context, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::ports::fal_service::{FalService, FalImageGenerationRequest};
use crate::ports::deepinfra_service::{DeepInfraService, DeepInfraImageGenerationRequest};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};
use crate::schema::manga::{
    MangaProject, MangaStory, MangaScene, MangaScript, MangaPage, MangaPanel,
    CharacterProfile, CompanyProfile, GenerationPrompt, Layer, SpeechBubble,
    GeneratedImage,
    CreateMangaProjectInput, UpdateMangaProjectInput,
    CreateMangaStoryInput, UpdateMangaStoryInput,
    CreateMangaSceneInput, UpdateMangaSceneInput,
    UpsertCharacterProfileInput, UpsertCompanyProfileInput,
    CreateMangaScriptInput, UpdateMangaScriptInput,
    CreateMangaPageInput, UpdateMangaPageInput,
    CreateMangaPanelInput, UpdateMangaPanelInput,
    UpsertGenerationPromptInput,
    CreateLayerInput, UpdateLayerInput,
    CreateSpeechBubbleInput, UpdateSpeechBubbleInput,
    GeneratePanelImagesInput, GeneratePanelImagesResult,
    GenerateStoryInput, GenerateStoryResult,
    ExportResult,
};

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Health check mutation
    async fn ping(&self) -> String {
        "pong".to_string()
    }

    /// Create manga project
    async fn create_manga_project(&self, ctx: &Context<'_>, input: CreateMangaProjectInput) -> Result<MangaProject> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let row = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_projects (title, description)
            VALUES ($1, $2)
            RETURNING id, title, description, created_at, updated_at
            "#,
        )
        .bind(&input.title)
        .bind(&input.description)
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create manga project: {}", e)))?;
        
        Ok(MangaProject {
            id: ID(row.0.to_string()),
            title: row.1,
            description: row.2,
            created_at: row.3.to_rfc3339(),
            updated_at: row.4.to_rfc3339(),
        })
    }

    /// Update manga project
    async fn update_manga_project(&self, ctx: &Context<'_>, id: ID, input: UpdateMangaProjectInput) -> Result<MangaProject> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Delete manga project
    async fn delete_manga_project(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Create manga story
    async fn create_manga_story(&self, ctx: &Context<'_>, input: CreateMangaStoryInput) -> Result<MangaStory> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update manga story
    async fn update_manga_story(&self, ctx: &Context<'_>, id: ID, input: UpdateMangaStoryInput) -> Result<MangaStory> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Create manga scene
    async fn create_manga_scene(&self, ctx: &Context<'_>, input: CreateMangaSceneInput) -> Result<MangaScene> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update manga scene
    async fn update_manga_scene(&self, ctx: &Context<'_>, id: ID, input: UpdateMangaSceneInput) -> Result<MangaScene> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Upsert character profile
    async fn upsert_character_profile(&self, ctx: &Context<'_>, input: UpsertCharacterProfileInput) -> Result<CharacterProfile> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Upsert company profile
    async fn upsert_company_profile(&self, ctx: &Context<'_>, input: UpsertCompanyProfileInput) -> Result<CompanyProfile> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Create manga script
    async fn create_manga_script(&self, ctx: &Context<'_>, input: CreateMangaScriptInput) -> Result<MangaScript> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update manga script
    async fn update_manga_script(&self, ctx: &Context<'_>, id: ID, input: UpdateMangaScriptInput) -> Result<MangaScript> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Create manga page
    async fn create_manga_page(&self, ctx: &Context<'_>, input: CreateMangaPageInput) -> Result<MangaPage> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update manga page
    async fn update_manga_page(&self, ctx: &Context<'_>, id: ID, input: UpdateMangaPageInput) -> Result<MangaPage> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Create manga panel
    async fn create_manga_panel(&self, ctx: &Context<'_>, input: CreateMangaPanelInput) -> Result<MangaPanel> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update manga panel
    async fn update_manga_panel(&self, ctx: &Context<'_>, id: ID, input: UpdateMangaPanelInput) -> Result<MangaPanel> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Upsert generation prompt
    async fn upsert_generation_prompt(&self, ctx: &Context<'_>, input: UpsertGenerationPromptInput) -> Result<GenerationPrompt> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Generate story
    async fn generate_story(&self, ctx: &Context<'_>, input: GenerateStoryInput) -> Result<GenerateStoryResult> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&input.project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        // Generate a script ID
        let script_id = format!("script_{}", Uuid::new_v4());
        
        // Create manga script
        let script_row = sqlx::query_as::<_, (Uuid, Uuid, String, String, Option<i32>, serde_json::Value, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_scripts (project_id, script_id, title, page_count, script_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, project_id, script_id, title, page_count, script_data, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(&script_id)
        .bind(format!("Generated Story: {}", &input.story_prompt[..input.story_prompt.len().min(50)]))
        .bind(1i32) // Default to 1 page for now
        .bind(serde_json::json!({
            "prompt": input.story_prompt,
            "continue_from_previous": input.continue_from_previous.unwrap_or(false),
            "preset": input.preset.clone().unwrap_or_default(),
        }))
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create manga script: {}", e)))?;
        
        let script = MangaScript {
            id: ID(script_row.0.to_string()),
            project_id: ID(script_row.1.to_string()),
            script_id: script_row.2,
            title: script_row.3,
            page_count: script_row.4,
            script_data: script_row.5,
            created_at: script_row.6.to_rfc3339(),
            updated_at: script_row.7.to_rfc3339(),
        };
        
        // Create a default page
        let page_id_str = format!("page_1");
        let page_row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, Option<String>, Option<String>, Option<i32>, i32, i32, Option<serde_json::Value>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_pages (project_id, script_id, page_id, page_type, description, page_number, width, height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, project_id, script_id, page_id, page_type, description, page_number, width, height, konva_stage_json, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(script_row.0) // Use script UUID
        .bind(&page_id_str)
        .bind("default" as &str)
        .bind::<Option<String>>(None)
        .bind(1i32)
        .bind(1200i32) // Default manga page width
        .bind(1800i32) // Default manga page height
        .fetch_one(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create manga page: {}", e)))?;
        
        let page = MangaPage {
            id: ID(page_row.0.to_string()),
            project_id: ID(page_row.1.to_string()),
            script_id: ID(page_row.2.to_string()),
            page_id: page_row.3,
            page_type: page_row.4,
            description: page_row.5,
            page_number: page_row.6,
            width: page_row.7,
            height: page_row.8,
            konva_stage_json: page_row.9,
            created_at: page_row.10.to_rfc3339(),
            updated_at: page_row.11.to_rfc3339(),
        };
        
        // Create a default panel for the page
        let panel_id_str = format!("panel_1");
        let _panel_row = sqlx::query(
            r#"
            INSERT INTO manga_panels (project_id, page_id, panel_id, layout, visual, x, y, width, height, z_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(project_uuid)
        .bind(page_row.0) // Use page UUID
        .bind(&panel_id_str)
        .bind::<Option<String>>(None) // layout
        .bind::<Option<String>>(None) // visual
        .bind(100i32) // x: default position
        .bind(100i32) // y: default position
        .bind(1000i32) // width: default size
        .bind(800i32) // height: default size
        .bind(1i32) // z_index: default layer
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create default panel: {}", e)))?;
        
        Ok(GenerateStoryResult {
            script,
            pages: vec![page],
        })
    }

    /// Generate panel images
    async fn generate_panel_images(&self, ctx: &Context<'_>, input: GeneratePanelImagesInput) -> Result<GeneratePanelImagesResult> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&input.project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        let mut generated_images = Vec::new();
        
        // Generate images based on provider
        for panel_id_str in &input.panel_ids {
            let image_data = match input.provider.as_str() {
                "fal" => {
                    let api_key = std::env::var("FAL_API_KEY")
                        .map_err(|_| async_graphql::Error::new("FAL_API_KEY not set"))?;
                    let fal_service = FalService::new(api_key);
                    
                    let fal_request = FalImageGenerationRequest {
                        prompt: input.prompt.clone(),
                        negative_prompt: input.negative_prompt.clone(),
                        model_id: input.model_id.clone(),
                        width: input.width.map(|w| w as u32),
                        height: input.height.map(|h| h as u32),
                        num_images: Some(1),
                    };
                    
                    let fal_response = fal_service.generate_image(fal_request).await
                        .map_err(|e| async_graphql::Error::new(format!("Failed to generate image with fal.ai: {}", e)))?;
                    
                    if fal_response.images.is_empty() {
                        return Err(async_graphql::Error::new("No images returned from fal.ai"));
                    }
                    
                    let image_url = &fal_response.images[0].url;
                    let image_bytes = fal_service.download_image(image_url).await
                        .map_err(|e| async_graphql::Error::new(format!("Failed to download image: {}", e)))?;
                    
                    Some(image_bytes)
                },
                "deepinfra" => {
                    let api_key = std::env::var("DEEPINFRA_API_KEY")
                        .map_err(|_| async_graphql::Error::new("DEEPINFRA_API_KEY not set"))?;
                    let deepinfra_service = DeepInfraService::new(api_key);
                    
                    let deepinfra_request = DeepInfraImageGenerationRequest {
                        prompt: input.prompt.clone(),
                        negative_prompt: input.negative_prompt.clone(),
                        model_id: input.model_id.clone(),
                        width: input.width.map(|w| w as u32),
                        height: input.height.map(|h| h as u32),
                        num_inference_steps: None,
                        guidance_scale: None,
                    };
                    
                    let deepinfra_response = deepinfra_service.generate_image(deepinfra_request).await
                        .map_err(|e| async_graphql::Error::new(format!("Failed to generate image with DeepInfra: {}", e)))?;
                    
                    if deepinfra_response.images.is_empty() {
                        return Err(async_graphql::Error::new("No images returned from DeepInfra"));
                    }
                    
                    let image_bytes = deepinfra_response.decode_images()
                        .map_err(|e| async_graphql::Error::new(format!("Failed to decode DeepInfra image: {}", e)))?;
                    
                    if image_bytes.is_empty() {
                        return Err(async_graphql::Error::new("No images decoded from DeepInfra"));
                    }
                    
                    Some(image_bytes[0].clone())
                },
                _ => {
                    return Err(async_graphql::Error::new(format!("Unsupported provider: {}", input.provider)));
                }
            };
            
            let image_data_bytes = image_data.ok_or_else(|| async_graphql::Error::new("Failed to generate image data"))?;
            
            // Parse panel_id
            let panel_uuid = Uuid::parse_str(&panel_id_str.0)
                .ok()
                .or_else(|| {
                    // If panel_id is not a UUID, create a new panel or use None
                    None
                });
            
            // Insert into database with bytea
            let row = sqlx::query_as::<_, (Uuid, Uuid, Option<Uuid>, String, Option<String>, Option<String>, Option<String>, String, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
                r#"
                INSERT INTO manga_generated_images (
                    project_id, panel_id, prompt, negative_prompt, 
                    image_url, image_base64, image_data, provider, model, model_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, project_id, panel_id, prompt, negative_prompt, 
                          image_url, image_base64, provider, model, model_id, created_at
                "#,
            )
            .bind(project_uuid)
            .bind(panel_uuid)
            .bind(&input.prompt)
            .bind(&input.negative_prompt)
            .bind::<Option<String>>(None) // image_url
            .bind::<Option<String>>(None) // image_base64
            .bind(&image_data_bytes) // image_data BYTEA
            .bind(&input.provider)
            .bind(&input.model_id) // Using model_id as model name for now
            .bind(Some(&input.model_id))
            .fetch_one(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to save generated image: {}", e)))?;
            
            // Encode image_data to base64 for GraphQL response
            let image_data_base64 = general_purpose::STANDARD.encode(&image_data_bytes);
            
            generated_images.push(GeneratedImage {
                id: ID(row.0.to_string()),
                project_id: ID(row.1.to_string()),
                panel_id: row.2.map(|u| ID(u.to_string())),
                prompt: row.3,
                negative_prompt: row.4,
                image_url: row.5,
                image_base64: row.6,
                image_data: Some(image_data_base64),
                provider: row.7,
                model: row.8,
                model_id: row.9,
                created_at: row.10.to_rfc3339(),
            });
        }
        
        Ok(GeneratePanelImagesResult {
            images: generated_images,
        })
    }

    /// Create layer
    async fn create_layer(&self, ctx: &Context<'_>, input: CreateLayerInput) -> Result<Layer> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update layer
    async fn update_layer(&self, ctx: &Context<'_>, id: ID, input: UpdateLayerInput) -> Result<Layer> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Create speech bubble
    async fn create_speech_bubble(&self, ctx: &Context<'_>, input: CreateSpeechBubbleInput) -> Result<SpeechBubble> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Update speech bubble
    async fn update_speech_bubble(&self, ctx: &Context<'_>, id: ID, input: UpdateSpeechBubbleInput) -> Result<SpeechBubble> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database mutation
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Export page
    async fn export_page(&self, ctx: &Context<'_>, id: ID, _format: String) -> Result<ExportResult> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement export functionality
        Err(async_graphql::Error::new("Not implemented"))
    }

    /// Export all pages
    async fn export_all_pages(&self, ctx: &Context<'_>, project_id: ID, _format: String) -> Result<ExportResult> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement export functionality
        Err(async_graphql::Error::new("Not implemented"))
    }
}

