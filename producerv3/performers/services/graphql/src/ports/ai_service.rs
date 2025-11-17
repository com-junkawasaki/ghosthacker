/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-text
 * 
 * AI Generator service integration
 * Supports text generation, summarization, proofreading, and translation
 */
use crate::schema::ai::{
    GeneratedText, GenerateTextInput, SummarizeInput, ProofreadInput, TranslateInput,
    MultiAgentGenerateInput, GeneratedContent,
};
use crate::schema::emotion::EmotionProfile;
use crate::ports::{postgres, emotion_service};
use serde::{Deserialize, Serialize};

/// Generate text using AI
pub async fn generate_text(input: GenerateTextInput) -> anyhow::Result<GeneratedText> {
    // TODO: Integrate with actual AI service (OpenAI, Anthropic, etc.)
    // For now, return placeholder with prompt
    Ok(GeneratedText {
        text: format!("Generated text for prompt: {}", input.prompt),
        confidence: Some(0.8),
    })
}

/// Summarize chapter content
pub async fn summarize_chapter(
    pool: &postgres::PostgresPool,
    input: SummarizeInput,
) -> anyhow::Result<GeneratedText> {
    // Get chapter content
    let chapter = postgres::get_chapter(pool, input.chapter_id.to_string())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to get chapter: {:?}", e))?
        .ok_or_else(|| anyhow::anyhow!("Chapter not found"))?;
    
    // TODO: Integrate with AI summarization service
    Ok(GeneratedText {
        text: format!("Summary of: {}", chapter.title),
        confidence: Some(0.9),
    })
}

/// Proofread chapter content
pub async fn proofread_chapter(
    pool: &postgres::PostgresPool,
    input: ProofreadInput,
) -> anyhow::Result<GeneratedText> {
    // Get chapter content
    let chapter = postgres::get_chapter(pool, input.chapter_id.to_string())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to get chapter: {:?}", e))?
        .ok_or_else(|| anyhow::anyhow!("Chapter not found"))?;
    
    // TODO: Integrate with AI proofreading service
    Ok(GeneratedText {
        text: chapter.content_html,
        confidence: Some(0.85),
    })
}

/// Translate chapter content
pub async fn translate_chapter(
    pool: &postgres::PostgresPool,
    input: TranslateInput,
) -> anyhow::Result<GeneratedText> {
    // Get chapter content
    let chapter = postgres::get_chapter(pool, input.chapter_id.to_string())
        .await
        .map_err(|e| anyhow::anyhow!("Failed to get chapter: {:?}", e))?
        .ok_or_else(|| anyhow::anyhow!("Chapter not found"))?;
    
    // TODO: Integrate with AI translation service
    Ok(GeneratedText {
        text: format!("Translated to {}: {}", input.target_language, chapter.content_html),
        confidence: Some(0.8),
    })
}

// OpenAI API structures
#[derive(Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    max_tokens: Option<i32>,
    temperature: Option<f64>,
}

#[derive(Serialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessageResponse,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct OpenAIMessageResponse {
    content: String,
}

/// Generate content with multi-agent model
pub async fn generate_content_with_multi_agent(
    pool: &postgres::PostgresPool,
    input: MultiAgentGenerateInput,
) -> anyhow::Result<GeneratedContent> {
    // Build prompt based on character, scene, POV context
    let prompt = build_character_prompt(&input)?;
    
    // Call OpenAI API
    let generated_text = generate_with_openai(
        &prompt,
        input.max_length,
        input.temperature,
    ).await?;
    
    // Analyze emotions for generated text
    let emotion_profile = emotion_service::analyze_emotions(
        pool,
        Some(generated_text.clone()),
        None,
        Some("ja".to_string()),
        Some(200),
    ).await.ok();
    
    Ok(GeneratedContent {
        text: generated_text,
        character_id: input.character_id,
        emotion_profile,
        confidence: Some(0.85),
    })
}

/// Build character prompt from context
fn build_character_prompt(input: &MultiAgentGenerateInput) -> anyhow::Result<String> {
    let mut prompt_parts = Vec::new();
    
    // Add context if provided
    if let Some(ref context) = input.context {
        prompt_parts.push(format!("Context: {}", context));
    }
    
    // Add character information if provided
    if let Some(ref character_id) = input.character_id {
        prompt_parts.push(format!("Character ID: {}", character_id));
    }
    
    // Add scene information if provided
    if let Some(ref scene_id) = input.scene_id {
        prompt_parts.push(format!("Scene ID: {}", scene_id));
    }
    
    // Add POV information if provided
    if let Some(ref pov_id) = input.pov_id {
        prompt_parts.push(format!("POV ID: {}", pov_id));
    }
    
    // Add emotion arc if provided
    if let Some(ref emotion_arc) = input.emotion_arc {
        prompt_parts.push("Emotion Arc:".to_string());
        for beat in emotion_arc {
            prompt_parts.push(format!("  Beat {}: {:?}", beat.position, beat.target_emotions));
        }
    }
    
    // Add main prompt
    prompt_parts.push(format!("Task: {}", input.prompt));
    
    Ok(prompt_parts.join("\n"))
}

/// Build narrator prompt from POV context
fn build_narrator_prompt(input: &MultiAgentGenerateInput) -> anyhow::Result<String> {
    let mut prompt_parts = Vec::new();
    
    // Add POV information
    if let Some(ref pov_id) = input.pov_id {
        prompt_parts.push(format!("Narrator POV ID: {}", pov_id));
    }
    
    // Add context
    if let Some(ref context) = input.context {
        prompt_parts.push(format!("Context: {}", context));
    }
    
    // Add main prompt
    prompt_parts.push(format!("Task: {}", input.prompt));
    
    Ok(prompt_parts.join("\n"))
}

/// Generate text with OpenAI API
async fn generate_with_openai(
    prompt: &str,
    max_tokens: Option<i32>,
    temperature: Option<f64>,
) -> anyhow::Result<String> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY environment variable not set"))?;
    
    let client = reqwest::Client::new();
    
    let request = OpenAIRequest {
        model: "gpt-4".to_string(),
        messages: vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: "You are a creative writing assistant. Generate engaging narrative content based on the provided context.".to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        max_tokens: max_tokens.or(Some(1000)),
        temperature: temperature.or(Some(0.7)),
    };
    
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to call OpenAI API: {:?}", e))?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
    }
    
    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse OpenAI response: {:?}", e))?;
    
    let generated_text = openai_response
        .choices
        .first()
        .and_then(|choice| Some(choice.message.content.clone()))
        .ok_or_else(|| anyhow::anyhow!("No content in OpenAI response"))?;
    
    Ok(generated_text)
}

/// Generate multi-agent content (character and narrator)
pub async fn generate_multi_agent_content(
    pool: &postgres::PostgresPool,
    input: MultiAgentGenerateInput,
) -> anyhow::Result<Vec<GeneratedContent>> {
    let mut results = Vec::new();
    
    // Generate character content if character_id is provided
    if input.character_id.is_some() {
        let character_prompt = build_character_prompt(&input)?;
        let character_text = generate_with_openai(
            &character_prompt,
            input.max_length,
            input.temperature,
        ).await?;
        
        let emotion_profile = emotion_service::analyze_emotions(
            pool,
            Some(character_text.clone()),
            None,
            Some("ja".to_string()),
            Some(200),
        ).await.ok();
        
        results.push(GeneratedContent {
            text: character_text,
            character_id: input.character_id.clone(),
            emotion_profile,
            confidence: Some(0.85),
        });
    }
    
    // Generate narrator content if pov_id is provided
    if input.pov_id.is_some() {
        let narrator_prompt = build_narrator_prompt(&input)?;
        let narrator_text = generate_with_openai(
            &narrator_prompt,
            input.max_length,
            input.temperature,
        ).await?;
        
        let emotion_profile = emotion_service::analyze_emotions(
            pool,
            Some(narrator_text.clone()),
            None,
            Some("ja".to_string()),
            Some(200),
        ).await.ok();
        
        results.push(GeneratedContent {
            text: narrator_text,
            character_id: None,
            emotion_profile,
            confidence: Some(0.85),
        });
    }
    
    Ok(results)
}

