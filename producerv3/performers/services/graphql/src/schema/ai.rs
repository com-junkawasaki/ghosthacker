/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI Generator GraphQL schema definitions
 */
use async_graphql::{InputObject, SimpleObject, ID};
use crate::schema::emotion::EmotionProfile;

#[derive(SimpleObject)]
pub struct GeneratedText {
    pub text: String,
    pub confidence: Option<f64>,
}

#[derive(InputObject)]
pub struct GenerateTextInput {
    pub prompt: String,
    pub max_length: Option<i32>,
    pub temperature: Option<f64>,
}

#[derive(InputObject)]
pub struct SummarizeInput {
    pub chapter_id: ID,
    pub max_length: Option<i32>,
}

#[derive(InputObject)]
pub struct ProofreadInput {
    pub chapter_id: ID,
    pub language: Option<String>,
}

#[derive(InputObject)]
pub struct TranslateInput {
    pub chapter_id: ID,
    pub target_language: String,
    pub source_language: Option<String>,
}

#[derive(InputObject)]
pub struct EmotionBeatInput {
    pub position: i32,
    pub target_emotions: Option<serde_json::Value>, // Map<String, f64>
}

#[derive(InputObject)]
pub struct MultiAgentGenerateInput {
    pub character_id: Option<ID>,
    pub scene_id: Option<ID>,
    pub pov_id: Option<ID>,
    pub context: Option<String>,
    pub emotion_arc: Option<Vec<EmotionBeatInput>>,
    pub prompt: String,
    pub max_length: Option<i32>,
    pub temperature: Option<f64>,
}

#[derive(SimpleObject)]
pub struct GeneratedContent {
    pub text: String,
    pub character_id: Option<ID>,
    pub emotion_profile: Option<EmotionProfile>,
    pub confidence: Option<f64>,
}

