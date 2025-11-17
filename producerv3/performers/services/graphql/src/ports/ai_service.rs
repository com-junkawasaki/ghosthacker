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
    ClassifyNodeInput, NodeClassificationResult, ReclassifySelectedNodesInput, ReclassifyResult,
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
        prompt_parts.push(format!("Character ID: {}", character_id.to_string()));
    }
    
    // Add scene information if provided
    if let Some(ref scene_id) = input.scene_id {
        prompt_parts.push(format!("Scene ID: {}", scene_id.to_string()));
    }
    
    // Add POV information if provided
    if let Some(ref pov_id) = input.pov_id {
        prompt_parts.push(format!("POV ID: {}", pov_id.to_string()));
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
        prompt_parts.push(format!("Narrator POV ID: {}", pov_id.to_string()));
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
        model: "gpt-4o".to_string(), // Updated to gpt-4o for better performance and cost efficiency
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

// Node classification structures
#[derive(Serialize)]
struct ClassificationRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: Option<f64>,
    response_format: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct ClassificationResponse {
    choices: Vec<OpenAIChoice>,
}

#[derive(Deserialize)]
struct ClassificationData {
    #[serde(rename = "suggestedType")]
    suggested_type: String,
    confidence: f64,
    reasoning: String,
    #[serde(rename = "suggestedAttributes")]
    suggested_attributes: Option<serde_json::Value>,
    #[serde(rename = "suggestedMaskType")]
    suggested_mask_type: Option<String>,
}

/// Classify a node using AI
pub async fn classify_node(input: ClassifyNodeInput) -> anyhow::Result<NodeClassificationResult> {
    let prompt = build_classification_prompt(&input)?;
    
    let classification_data = classify_with_openai(&prompt).await?;
    
    Ok(NodeClassificationResult {
        suggested_type: classification_data.suggested_type,
        confidence: classification_data.confidence,
        reasoning: classification_data.reasoning,
        suggested_attributes: classification_data.suggested_attributes,
        suggested_mask_type: classification_data.suggested_mask_type,
    })
}

/// Build classification prompt from input
fn build_classification_prompt(input: &ClassifyNodeInput) -> anyhow::Result<String> {
    let mut prompt_parts = Vec::new();
    
    prompt_parts.push("You are a node classification assistant for a narrative editing system. Analyze the following text and classify it into one of these node types:".to_string());
    prompt_parts.push("".to_string());
    prompt_parts.push("Node types:".to_string());
    prompt_parts.push("- character: A person or character in the story".to_string());
    prompt_parts.push("- location: A place or location".to_string());
    prompt_parts.push("- scene: A scene or sequence of events".to_string());
    prompt_parts.push("- technology: A technology, tool, or device".to_string());
    prompt_parts.push("- organization: An organization, company, or group".to_string());
    prompt_parts.push("- ghost: A ghost or supernatural entity".to_string());
    prompt_parts.push("- episode: An episode or chapter".to_string());
    prompt_parts.push("- arc: A story arc".to_string());
    prompt_parts.push("- motif: A recurring theme or motif".to_string());
    prompt_parts.push("- event: An event or occurrence".to_string());
    prompt_parts.push("".to_string());
    
    prompt_parts.push(format!("Text to classify: {}", input.text));
    
    if let Some(ref current_type) = input.current_type {
        prompt_parts.push(format!("Current type: {}", current_type));
    }
    
    if let Some(ref attributes) = input.attributes {
        prompt_parts.push(format!("Current attributes: {}", serde_json::to_string(attributes)?));
    }
    
    if let Some(ref mask_info) = input.mask_info {
        prompt_parts.push(format!("Mask information: {}", serde_json::to_string(mask_info)?));
    }
    
    if let Some(ref context) = input.context {
        prompt_parts.push(format!("Context: {}", context));
    }
    
    prompt_parts.push("".to_string());
    prompt_parts.push("Respond with a JSON object containing:".to_string());
    prompt_parts.push("- suggestedType: The recommended node type".to_string());
    prompt_parts.push("- confidence: A confidence score between 0 and 1".to_string());
    prompt_parts.push("- reasoning: Explanation for the classification".to_string());
    prompt_parts.push("- suggestedAttributes: Recommended attributes as JSON object (optional)".to_string());
    prompt_parts.push("- suggestedMaskType: Recommended mask type if applicable (optional)".to_string());
    
    Ok(prompt_parts.join("\n"))
}

/// Classify node with OpenAI API
async fn classify_with_openai(prompt: &str) -> anyhow::Result<ClassificationData> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY environment variable not set"))?;
    
    let client = reqwest::Client::new();
    
    // Use environment variable for model, fallback to gpt-4o
    let model = std::env::var("OPENAI_MODEL")
        .unwrap_or_else(|_| "gpt-4o".to_string());
    
    // Don't use response_format to avoid model compatibility issues
    // Instead, rely on prompt engineering to ensure JSON output
    let request = ClassificationRequest {
        model: model.clone(),
        messages: vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: "You are a node classification assistant. You MUST respond with valid JSON only, no markdown code blocks, no additional text, no explanation. Return only the JSON object.".to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        temperature: Some(0.3),
        response_format: None, // Not using response_format to ensure compatibility with all models
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
    
    let openai_response: ClassificationResponse = response
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse OpenAI response: {:?}", e))?;
    
    let content = openai_response
        .choices
        .first()
        .and_then(|choice| Some(choice.message.content.clone()))
        .ok_or_else(|| anyhow::anyhow!("No content in OpenAI response"))?;
    
    // Extract JSON from content (handle markdown code blocks if present)
    let json_content = if content.trim_start().starts_with("```") {
        // Extract JSON from markdown code block
        let lines: Vec<&str> = content.lines().collect();
        let json_start = lines.iter().position(|l| l.trim().starts_with("```json") || l.trim().starts_with("```"));
        let json_end = lines.iter().rposition(|l| l.trim() == "```");
        
        if let (Some(start), Some(end)) = (json_start, json_end) {
            lines[start + 1..end].join("\n")
        } else {
            // Try to find JSON object in content
            if let Some(start_idx) = content.find('{') {
                if let Some(end_idx) = content.rfind('}') {
                    content[start_idx..=end_idx].to_string()
                } else {
                    content
                }
            } else {
                content
            }
        }
    } else {
        // Try to extract JSON object if wrapped in text
        if let Some(start_idx) = content.find('{') {
            if let Some(end_idx) = content.rfind('}') {
                content[start_idx..=end_idx].to_string()
            } else {
                content
            }
        } else {
            content
        }
    };
    
    let classification_data: ClassificationData = serde_json::from_str(&json_content)
        .map_err(|e| anyhow::anyhow!("Failed to parse classification data from content: {:?}. Content: {}", e, json_content))?;
    
    Ok(classification_data)
}

/// Reclassify multiple nodes
pub async fn reclassify_nodes(
    input: ReclassifySelectedNodesInput,
) -> anyhow::Result<Vec<ReclassifyResult>> {
    let mut results = Vec::new();
    
    // For now, return placeholder results
    // In a real implementation, this would process each node
    for node_id in input.node_ids {
        // This would need to fetch node data from database and classify each one
        // For now, return a placeholder
        results.push(ReclassifyResult {
            node_id,
            classification: NodeClassificationResult {
                suggested_type: "character".to_string(),
                confidence: 0.8,
                reasoning: "Placeholder classification".to_string(),
                suggested_attributes: None,
                suggested_mask_type: None,
            },
            applied: false,
        });
    }
    
    Ok(results)
}

