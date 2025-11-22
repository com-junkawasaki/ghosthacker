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
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement AI story generation
        Err(async_graphql::Error::new("Not implemented"))
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

