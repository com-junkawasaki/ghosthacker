/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-schema-storyboard
 * 
 * GraphQL schema types for Storyboard Editor
 */
use async_graphql::{SimpleObject, ID};

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
