/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/manga-schema
 * 
 * GraphQL schema definitions for manga entities
 */
use async_graphql::{SimpleObject, InputObject, ID};
use serde_json::Value;

#[derive(SimpleObject, Clone)]
pub struct MangaProject {
    pub id: ID,
    pub title: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateMangaProjectInput {
    pub title: String,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateMangaProjectInput {
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct MangaStory {
    pub id: ID,
    pub project_id: ID,
    pub story_id: String,
    pub title: String,
    pub temporal: Option<String>,
    pub description: Option<String>,
    pub theme: Vec<String>,
    pub story_data: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateMangaStoryInput {
    pub project_id: ID,
    pub story_id: String,
    pub title: String,
    pub temporal: Option<String>,
    pub description: Option<String>,
    pub theme: Vec<String>,
    pub story_data: Value,
}

#[derive(InputObject)]
pub struct UpdateMangaStoryInput {
    pub title: Option<String>,
    pub temporal: Option<String>,
    pub description: Option<String>,
    pub theme: Option<Vec<String>>,
    pub story_data: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct MangaScene {
    pub id: ID,
    pub project_id: ID,
    pub story_id: ID,
    pub scene_id: String,
    pub name: String,
    pub content: Option<String>,
    pub participants: Vec<String>,
    pub action: Vec<String>,
    pub scene_data: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateMangaSceneInput {
    pub project_id: ID,
    pub story_id: ID,
    pub scene_id: String,
    pub name: String,
    pub content: Option<String>,
    pub participants: Vec<String>,
    pub action: Vec<String>,
    pub scene_data: Value,
}

#[derive(InputObject)]
pub struct UpdateMangaSceneInput {
    pub name: Option<String>,
    pub content: Option<String>,
    pub participants: Option<Vec<String>>,
    pub action: Option<Vec<String>>,
    pub scene_data: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct CharacterProfile {
    pub id: ID,
    pub project_id: ID,
    pub profile_id: String,
    pub title: String,
    pub characters: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct UpsertCharacterProfileInput {
    pub project_id: ID,
    pub profile_id: String,
    pub title: String,
    pub characters: Value,
}

#[derive(SimpleObject, Clone)]
pub struct CompanyProfile {
    pub id: ID,
    pub project_id: ID,
    pub company_id: String,
    pub name: String,
    pub location: Option<Value>,
    pub employee_count: Option<i32>,
    pub founding_date: Option<String>,
    pub business_type: Option<String>,
    pub atmosphere: Option<String>,
    pub incident_report: Option<Value>,
    pub company_data: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct UpsertCompanyProfileInput {
    pub project_id: ID,
    pub company_id: String,
    pub name: String,
    pub location: Option<Value>,
    pub employee_count: Option<i32>,
    pub founding_date: Option<String>,
    pub business_type: Option<String>,
    pub atmosphere: Option<String>,
    pub incident_report: Option<Value>,
    pub company_data: Value,
}

#[derive(SimpleObject, Clone)]
pub struct GenerationPrompt {
    pub id: ID,
    pub project_id: ID,
    pub prompt_id: String,
    pub style_prompt_en: Option<String>,
    pub scene_prompts: Option<Value>,
    pub panel_prompts: Option<Value>,
    pub prompt_data: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct UpsertGenerationPromptInput {
    pub project_id: ID,
    pub prompt_id: String,
    pub style_prompt_en: Option<String>,
    pub scene_prompts: Option<Value>,
    pub panel_prompts: Option<Value>,
    pub prompt_data: Value,
}

#[derive(SimpleObject, Clone)]
pub struct MangaScript {
    pub id: ID,
    pub project_id: ID,
    pub script_id: String,
    pub title: String,
    pub page_count: Option<i32>,
    pub script_data: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateMangaScriptInput {
    pub project_id: ID,
    pub script_id: String,
    pub title: String,
    pub page_count: Option<i32>,
    pub script_data: Value,
}

#[derive(InputObject)]
pub struct UpdateMangaScriptInput {
    pub title: Option<String>,
    pub page_count: Option<i32>,
    pub script_data: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct MangaPage {
    pub id: ID,
    pub project_id: ID,
    pub script_id: ID,
    pub page_id: String,
    pub page_type: Option<String>,
    pub description: Option<String>,
    pub page_number: Option<i32>,
    pub width: i32,
    pub height: i32,
    pub konva_stage_json: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateMangaPageInput {
    pub project_id: ID,
    pub script_id: ID,
    pub page_id: String,
    pub page_type: Option<String>,
    pub description: Option<String>,
    pub page_number: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub konva_stage_json: Option<Value>,
}

#[derive(InputObject)]
pub struct UpdateMangaPageInput {
    pub page_type: Option<String>,
    pub description: Option<String>,
    pub page_number: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub konva_stage_json: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct Dialogue {
    pub speaker: String,
    pub text: String,
}

#[derive(SimpleObject, Clone)]
pub struct MangaPanel {
    pub id: ID,
    pub project_id: ID,
    pub page_id: ID,
    pub panel_id: i32,
    pub layout: Option<String>,
    pub visual: Option<String>,
    pub dialogue: Vec<Dialogue>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub z_index: i32,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub panel_data: Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateMangaPanelInput {
    pub project_id: ID,
    pub page_id: ID,
    pub panel_id: i32,
    pub layout: Option<String>,
    pub visual: Option<String>,
    pub dialogue: Vec<DialogueInput>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub z_index: Option<i32>,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub panel_data: Value,
}

#[derive(InputObject)]
pub struct DialogueInput {
    pub speaker: String,
    pub text: String,
}

#[derive(InputObject)]
pub struct UpdateMangaPanelInput {
    pub layout: Option<String>,
    pub visual: Option<String>,
    pub dialogue: Option<Vec<DialogueInput>>,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub z_index: Option<i32>,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub panel_data: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct Layer {
    pub id: ID,
    pub panel_id: ID,
    pub layer_name: String,
    pub layer_type: String,
    pub z_index: i32,
    pub visible: bool,
    pub opacity: f64,
    pub konva_data: Option<Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateLayerInput {
    pub project_id: ID,
    pub panel_id: ID,
    pub layer_name: String,
    pub layer_type: String,
    pub z_index: Option<i32>,
    pub visible: Option<bool>,
    pub opacity: Option<f64>,
    pub konva_data: Option<Value>,
}

#[derive(InputObject)]
pub struct UpdateLayerInput {
    pub layer_name: Option<String>,
    pub layer_type: Option<String>,
    pub z_index: Option<i32>,
    pub visible: Option<bool>,
    pub opacity: Option<f64>,
    pub konva_data: Option<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct SpeechBubble {
    pub id: ID,
    pub panel_id: ID,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub text: String,
    pub speaker: Option<String>,
    pub bubble_type: String,
    pub font_size: i32,
    pub font_family: String,
    pub konva_node_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(InputObject)]
pub struct CreateSpeechBubbleInput {
    pub project_id: ID,
    pub panel_id: ID,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub text: String,
    pub speaker: Option<String>,
    pub bubble_type: String,
    pub font_size: Option<i32>,
    pub font_family: Option<String>,
    pub konva_node_id: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateSpeechBubbleInput {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub text: Option<String>,
    pub speaker: Option<String>,
    pub bubble_type: Option<String>,
    pub font_size: Option<i32>,
    pub font_family: Option<String>,
    pub konva_node_id: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct AIModel {
    pub id: ID,
    pub provider: String,
    pub model_id: String,
    pub model_name: String,
    pub model_type: String,
    pub preview_image_url: Option<String>,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct GeneratedImage {
    pub id: ID,
    pub project_id: ID,
    pub panel_id: Option<ID>,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub provider: String,
    pub model: String,
    pub model_id: Option<String>,
    pub created_at: String,
}

#[derive(InputObject)]
pub struct GeneratePanelImagesInput {
    pub project_id: ID,
    pub panel_ids: Vec<ID>,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub provider: String,
    pub model_id: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
}

#[derive(SimpleObject)]
pub struct GeneratePanelImagesResult {
    pub images: Vec<GeneratedImage>,
}

#[derive(InputObject)]
pub struct GenerateStoryInput {
    pub project_id: ID,
    pub story_prompt: String,
    pub continue_from_previous: Option<bool>,
    pub preset: Option<String>,
}

#[derive(SimpleObject)]
pub struct GenerateStoryResult {
    pub script: MangaScript,
    pub pages: Vec<MangaPage>,
}

#[derive(InputObject)]
pub struct ExportFormat {
    pub format: String, // 'png', 'jpeg', 'pdf'
    pub resolution: Option<i32>, // DPI for PDF
}

#[derive(SimpleObject)]
pub struct ExportResult {
    pub url: String,
    pub format: String,
}

