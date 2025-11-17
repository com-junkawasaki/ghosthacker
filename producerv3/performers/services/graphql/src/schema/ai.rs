/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI Generator GraphQL schema definitions
 */
use async_graphql::{InputObject, SimpleObject, ID};

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

