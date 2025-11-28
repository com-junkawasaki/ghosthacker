//! Data models for the Unified IR Pipeline API

use serde::{Deserialize, Serialize};

// Entity models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub r#type: String,
    pub name: Option<String>,
    pub llm_label: Option<String>,
    pub embed_hint: Option<String>,
    pub image_prompt: Option<String>,
    pub video_prompt: Option<String>,
    pub embedding_id: Option<String>,
    pub data: serde_json::Value,
}

// Relation models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relation {
    pub id: String,
    pub relation_type: String,
    pub from: String,
    pub to: String,
    pub scene: Option<String>,
    pub strength: Option<f32>,
    pub llm_label: Option<String>,
    pub embed_hint: Option<String>,
    pub embedding_id: Option<String>,
}

// Request/Response models
#[derive(Debug, Deserialize)]
pub struct CreateEntityRequest {
    pub r#type: String,
    pub name: Option<String>,
    pub llm_label: Option<String>,
    pub embed_hint: Option<String>,
    pub image_prompt: Option<String>,
    pub video_prompt: Option<String>,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct CreateRelationRequest {
    pub relation_type: String,
    pub from: String,
    pub to: String,
    pub scene: Option<String>,
    pub strength: Option<f32>,
}

#[derive(Debug, Deserialize)]
pub struct VectorSearchRequest {
    pub query: String,
    pub limit: Option<u32>,
    pub threshold: Option<f32>,
}

#[derive(Debug, Serialize)]
pub struct VectorSearchResponse {
    pub results: Vec<VectorSearchResult>,
}

#[derive(Debug, Serialize)]
pub struct VectorSearchResult {
    pub entity_id: String,
    pub similarity: f32,
    pub entity: Entity,
}

