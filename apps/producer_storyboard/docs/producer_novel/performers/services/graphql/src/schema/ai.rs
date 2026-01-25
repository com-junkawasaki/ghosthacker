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

#[derive(InputObject)]
pub struct ClassifyNodeInput {
    pub text: String,
    pub current_type: Option<String>,
    pub attributes: Option<serde_json::Value>,
    pub mark_info: Option<serde_json::Value>,
    pub context: Option<String>,
}

#[derive(SimpleObject)]
pub struct NodeClassificationResult {
    pub suggested_type: String,
    pub confidence: f64,
    pub reasoning: String,
    pub suggested_attributes: Option<serde_json::Value>,
    pub suggested_mark_type: Option<String>,
}

#[derive(InputObject)]
pub struct ReclassifySelectedNodesInput {
    pub node_ids: Vec<ID>,
    pub context: Option<String>,
}

#[derive(SimpleObject)]
pub struct ReclassifyResult {
    pub node_id: ID,
    pub classification: NodeClassificationResult,
    pub applied: bool,
}

#[derive(InputObject)]
pub struct UpdateNodeTypeInput {
    pub node_id: ID,
    pub old_type: String,
    pub new_type: String,
    pub attributes: Option<serde_json::Value>,
}

#[derive(SimpleObject)]
pub struct UpdateNodeTypeResult {
    pub success: bool,
    pub node_id: ID,
    pub new_type: String,
    pub message: Option<String>,
}

#[derive(InputObject)]
pub struct AnalyzeNodeContentInput {
    pub node_id: Option<ID>,
    pub node_type: String,
    pub content_text: String,
    pub context: Option<String>,
}

#[derive(SimpleObject)]
pub struct DetectedNode {
    pub text: String,
    pub node_type: String,
    pub confidence: f64,
    pub position: Option<TextPosition>,
}

#[derive(SimpleObject)]
pub struct TextPosition {
    pub start: i32,
    pub end: i32,
}

#[derive(SimpleObject)]
pub struct RecommendedMask {
    pub mark_type: String,
    pub confidence: f64,
}

#[derive(SimpleObject)]
pub struct AnalyzeNodeContentResult {
    pub detected_nodes: Vec<DetectedNode>,
    pub recommended_masks: Vec<RecommendedMask>,
    pub emotion_profile: Option<EmotionProfile>,
}

