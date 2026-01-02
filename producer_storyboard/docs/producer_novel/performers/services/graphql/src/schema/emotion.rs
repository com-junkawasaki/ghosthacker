/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/analyze-emotions
 * 
 * Emotion Analysis GraphQL schema definitions
 */
use async_graphql::{InputObject, SimpleObject, ID};

#[derive(SimpleObject)]
pub struct EmotionProfile {
    pub emotion_vector: Vec<EmotionScore>,
    pub created_at: String,
    pub language: String,
}

#[derive(SimpleObject)]
pub struct EmotionScore {
    pub emotion: String, // joy, sadness, fear, anger, surprise, trust, anticipation, disgust, relief, hope
    pub score: f64, // 0-1
}

#[derive(InputObject)]
pub struct AnalyzeEmotionsInput {
    /// Text to analyze (if provided, chapter_id is ignored)
    pub text: Option<String>,
    /// Chapter ID to analyze (if text is not provided)
    pub chapter_id: Option<ID>,
    /// Language code (default: "ja")
    pub language: Option<String>,
    /// Maximum number of sentences to analyze (default: 200)
    pub max_sentences: Option<i32>,
}

