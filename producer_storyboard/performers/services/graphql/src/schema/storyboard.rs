/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-schema-storyboard
 * 
 * GraphQL schema types for Storyboard Editor
 */
use async_graphql::{SimpleObject, ComplexObject, Context, ID, Result};
use crate::ports::postgres::PostgresPool;
use uuid::Uuid;
use sqlx::Row;

#[derive(SimpleObject, Clone)]
pub struct Project {
    pub id: ID,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct Storyboard {
    pub id: ID,
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub title: String,
    #[graphql(name = "aspectRatio")]
    pub aspect_ratio: String,
    pub resolution: String,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<i32>,
    #[graphql(name = "numVariations")]
    pub num_variations: i32,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct Scene {
    pub id: ID,
    #[graphql(name = "storyboardId")]
    pub storyboard_id: ID,
    #[graphql(name = "sceneNumber")]
    pub scene_number: i32,
    #[graphql(name = "textDescription")]
    pub text_description: Option<String>,
    #[graphql(name = "mediaType")]
    pub media_type: Option<String>,
    #[graphql(name = "mediaUrl")]
    pub media_url: Option<String>,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "transitionType")]
    pub transition_type: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct VideoStatus {
    pub id: ID,
    #[graphql(name = "storyboardId")]
    pub storyboard_id: ID,
    #[graphql(name = "variationNumber")]
    pub variation_number: i32,
    #[graphql(name = "videoUrl")]
    pub video_url: Option<String>,
    pub status: String,
    #[graphql(name = "errorMessage")]
    pub error_message: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct GeneratedImage {
    pub id: ID,
    #[graphql(name = "sceneId")]
    pub scene_id: ID,
    #[graphql(name = "openaiImageId")]
    pub openai_image_id: Option<String>,
    #[graphql(name = "imageFormat")]
    pub image_format: Option<String>,
    #[graphql(name = "imageType")]
    pub image_type: Option<String>,
    pub prompt: Option<String>,
    pub model: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct OperationHistory {
    pub id: ID,
    #[graphql(name = "entityType")]
    pub entity_type: String,
    #[graphql(name = "entityId")]
    pub entity_id: ID,
    #[graphql(name = "operationType")]
    pub operation_type: String,
    #[graphql(name = "operationData")]
    pub operation_data: String,
    #[graphql(name = "userId")]
    pub user_id: Option<ID>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone)]
#[graphql(complex)]
pub struct Character {
    pub id: ID,
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
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[ComplexObject]
impl Character {
    /// Get assets for this character
    async fn assets(&self, ctx: &Context<'_>) -> Result<Vec<CharacterAsset>> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let character_uuid = Uuid::parse_str(&self.id.0)
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
}

#[derive(SimpleObject, Clone)]
pub struct CharacterAsset {
    pub id: ID,
    #[graphql(name = "characterId")]
    pub character_id: ID,
    #[graphql(name = "assetType")]
    pub asset_type: String,
    #[graphql(name = "assetFormat")]
    pub asset_format: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct Dialogue {
    pub id: ID,
    #[graphql(name = "sceneId")]
    pub scene_id: ID,
    #[graphql(name = "characterId")]
    pub character_id: ID,
    pub language: String,
    pub text: String,
    #[graphql(name = "translatedText")]
    pub translated_text: Option<String>,
    #[graphql(name = "humeVoiceId")]
    pub hume_voice_id: Option<String>,
    #[graphql(name = "audioUrl")]
    pub audio_url: Option<String>,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "orderIndex")]
    pub order_index: i32,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct HumeVoice {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub language: Option<String>,
}
