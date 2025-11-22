/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manga-queries
 * 
 * GraphQL Query resolvers
 */
use async_graphql::{Context, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use uuid::Uuid;
use sqlx::Row;
use crate::schema::manga::{
    MangaProject, MangaStory, MangaScene, MangaScript, MangaPage, MangaPanel,
    CharacterProfile, CompanyProfile, GenerationPrompt, AIModel, GeneratedImage,
};

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Health check
    async fn health(&self) -> String {
        "ok".to_string()
    }

    /// Get manga project by ID
    async fn manga_project(&self, ctx: &Context<'_>, id: ID) -> Result<Option<MangaProject>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let uuid = Uuid::parse_str(&id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        let row = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM manga_projects
            WHERE id = $1
            "#,
        )
        .bind(uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch manga project: {}", e)))?;
        
        Ok(row.map(|row| MangaProject {
            id: ID(row.0.to_string()),
            title: row.1,
            description: row.2,
            created_at: row.3.to_rfc3339(),
            updated_at: row.4.to_rfc3339(),
        }))
    }

    /// List all manga projects
    async fn manga_projects(&self, ctx: &Context<'_>) -> Result<Vec<MangaProject>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM manga_projects
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch manga projects: {}", e)))?;
        
        Ok(rows
            .into_iter()
            .map(|row| MangaProject {
                id: ID(row.0.to_string()),
                title: row.1,
                description: row.2,
                created_at: row.3.to_rfc3339(),
                updated_at: row.4.to_rfc3339(),
            })
            .collect())
    }

    /// Get manga story by ID
    async fn manga_story(&self, ctx: &Context<'_>, id: ID) -> Result<Option<MangaStory>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List manga stories for a project
    async fn manga_stories(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<MangaStory>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// Get manga scene by ID
    async fn manga_scene(&self, ctx: &Context<'_>, id: ID) -> Result<Option<MangaScene>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List manga scenes for a story
    async fn manga_scenes(&self, ctx: &Context<'_>, story_id: ID) -> Result<Vec<MangaScene>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// Get character profile by ID
    async fn character_profile(&self, ctx: &Context<'_>, id: ID) -> Result<Option<CharacterProfile>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List character profiles for a project
    async fn character_profiles(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<CharacterProfile>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// Get company profile by ID
    async fn company_profile(&self, ctx: &Context<'_>, id: ID) -> Result<Option<CompanyProfile>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List company profiles for a project
    async fn company_profiles(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<CompanyProfile>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// Get manga script by ID
    async fn manga_script(&self, ctx: &Context<'_>, id: ID) -> Result<Option<MangaScript>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List manga scripts for a project
    async fn manga_scripts(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<MangaScript>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// Get manga page by ID
    async fn manga_page(&self, ctx: &Context<'_>, id: ID) -> Result<Option<MangaPage>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List manga pages for a script
    async fn manga_pages(&self, ctx: &Context<'_>, script_id: ID) -> Result<Vec<MangaPage>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// Get manga panel by ID
    async fn manga_panel(&self, ctx: &Context<'_>, id: ID) -> Result<Option<MangaPanel>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List manga panels for a page
    async fn manga_panels(&self, ctx: &Context<'_>, page_id: ID) -> Result<Vec<MangaPanel>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let page_uuid = Uuid::parse_str(&page_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid page ID: {}", e)))?;
        
        use base64::{Engine as _, engine::general_purpose};
        
        let rows = sqlx::query(
            r#"
            SELECT id, project_id, page_id, panel_id, layout, visual, 
                   panel_data, image_url, image_base64, image_data,
                   x, y, width, height, z_index,
                   created_at, updated_at
            FROM manga_panels
            WHERE page_id = $1
            ORDER BY panel_id ASC
            "#,
        )
        .bind(page_uuid)
        .fetch_all(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch manga panels: {}", e)))?;
        
        // Parse rows manually
        let mut panels = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id")?;
            let project_id: Uuid = row.try_get("project_id")?;
            let page_id_uuid: Uuid = row.try_get("page_id")?;
            let panel_id: i32 = row.try_get("panel_id")?;
            let layout: Option<String> = row.try_get("layout")?;
            let visual: Option<String> = row.try_get("visual")?;
            let panel_data: serde_json::Value = row.try_get("panel_data")?;
            let image_url: Option<String> = row.try_get("image_url")?;
            let image_base64: Option<String> = row.try_get("image_base64")?;
            let image_data: Option<Vec<u8>> = row.try_get("image_data")?;
            let x: Option<i32> = row.try_get("x")?;
            let y: Option<i32> = row.try_get("y")?;
            let width: Option<i32> = row.try_get("width")?;
            let height: Option<i32> = row.try_get("height")?;
            let z_index: i32 = row.try_get("z_index")?;
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at")?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at")?;
            
            let dialogue = if let Some(dialogue_array) = panel_data.get("dialogue").and_then(|v| v.as_array()) {
                dialogue_array
                    .iter()
                    .filter_map(|item| {
                        if let (Some(speaker), Some(text)) = (
                            item.get("speaker").and_then(|v| v.as_str()),
                            item.get("text").and_then(|v| v.as_str()),
                        ) {
                            Some(crate::schema::manga::Dialogue {
                                speaker: speaker.to_string(),
                                text: text.to_string(),
                            })
                        } else {
                            None
                        }
                    })
                    .collect()
            } else {
                Vec::new()
            };
            
            let image_data_base64 = image_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));
            
            panels.push(MangaPanel {
                id: ID(id.to_string()),
                project_id: ID(project_id.to_string()),
                page_id: ID(page_id_uuid.to_string()),
                panel_id,
                layout,
                visual,
                dialogue,
                x,
                y,
                width,
                height,
                z_index,
                image_url,
                image_base64,
                image_data: image_data_base64,
                panel_data,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }
        
        Ok(panels)
    }

    /// Get generation prompt by ID
    async fn generation_prompt(&self, ctx: &Context<'_>, id: ID) -> Result<Option<GenerationPrompt>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(None)
    }

    /// List generation prompts for a project
    async fn generation_prompts(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<GenerationPrompt>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query
        Ok(vec![])
    }

    /// List AI models
    async fn ai_models(&self, ctx: &Context<'_>, provider: Option<String>) -> Result<Vec<AIModel>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query or API call
        Ok(vec![])
    }

    /// Get AI model by provider and model ID
    async fn ai_model(&self, ctx: &Context<'_>, provider: String, model_id: String) -> Result<Option<AIModel>> {
        let _pool = ctx.data::<PostgresPool>()?;
        // TODO: Implement database query or API call
        Ok(None)
    }

    /// List generated images
    async fn generated_images(&self, ctx: &Context<'_>, project_id: ID, panel_id: Option<ID>) -> Result<Vec<GeneratedImage>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let project_uuid = Uuid::parse_str(&project_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
        
        use base64::{Engine as _, engine::general_purpose};
        
        let rows = if let Some(panel_id) = panel_id {
            let panel_uuid = Uuid::parse_str(&panel_id.0)
                .map_err(|e| async_graphql::Error::new(format!("Invalid panel ID: {}", e)))?;
            
            sqlx::query_as::<_, (Uuid, Uuid, Option<Uuid>, String, Option<String>, Option<String>, Option<String>, Option<Vec<u8>>, String, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
                r#"
                SELECT id, project_id, panel_id, prompt, negative_prompt, 
                       image_url, image_base64, image_data, provider, model, model_id, created_at
                FROM manga_generated_images
                WHERE project_id = $1 AND panel_id = $2
                ORDER BY created_at DESC
                "#,
            )
            .bind(project_uuid)
            .bind(panel_uuid)
            .fetch_all(pool.as_ref())
            .await
        } else {
            sqlx::query_as::<_, (Uuid, Uuid, Option<Uuid>, String, Option<String>, Option<String>, Option<String>, Option<Vec<u8>>, String, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
                r#"
                SELECT id, project_id, panel_id, prompt, negative_prompt, 
                       image_url, image_base64, image_data, provider, model, model_id, created_at
                FROM manga_generated_images
                WHERE project_id = $1
                ORDER BY created_at DESC
                "#,
            )
            .bind(project_uuid)
            .fetch_all(pool.as_ref())
            .await
        }
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch generated images: {}", e)))?;
        
        Ok(rows
            .into_iter()
            .map(|row| {
                let image_data_base64 = row.7.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));
                
                GeneratedImage {
                    id: ID(row.0.to_string()),
                    project_id: ID(row.1.to_string()),
                    panel_id: row.2.map(|u| ID(u.to_string())),
                    prompt: row.3,
                    negative_prompt: row.4,
                    image_url: row.5,
                    image_base64: row.6,
                    image_data: image_data_base64,
                    provider: row.8,
                    model: row.9,
                    model_id: row.10,
                    created_at: row.11.to_rfc3339(),
                }
            })
            .collect())
    }
}

