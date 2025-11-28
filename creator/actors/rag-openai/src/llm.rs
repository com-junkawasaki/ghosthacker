//! OpenAI Chat Completions API Integration
//! 
//! Generate text (scripts, novels, etc.) from Scene/Character IR using GPT-4

use crate::OpenAIClient;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// LLM model options
#[derive(Debug, Clone, Copy)]
pub enum LLMModel {
    /// GPT-4 Turbo (default)
    Gpt4Turbo,
    /// GPT-4
    Gpt4,
    /// GPT-3.5 Turbo
    Gpt35Turbo,
}

impl LLMModel {
    fn as_str(&self) -> &'static str {
        match self {
            LLMModel::Gpt4Turbo => "gpt-4-turbo-preview",
            LLMModel::Gpt4 => "gpt-4",
            LLMModel::Gpt35Turbo => "gpt-3.5-turbo",
        }
    }
}

/// Chat message role
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

/// Chat message
#[derive(Debug, Clone, Serialize)]
pub struct ChatMessage {
    role: MessageRole,
    content: String,
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::System,
            content: content.into(),
        }
    }
    
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::User,
            content: content.into(),
        }
    }
    
    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: MessageRole::Assistant,
            content: content.into(),
        }
    }
}

/// Chat completion request
#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

/// Chat completion response
#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
    usage: ChatUsage,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessageResponse,
    finish_reason: String,
}

#[derive(Debug, Deserialize)]
struct ChatMessageResponse {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

/// Generate text from prompt and context
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `prompt` - User prompt
/// * `context` - Optional context (system message or additional context)
/// * `model` - LLM model to use
/// * `temperature` - Sampling temperature (0.0-2.0, default: 0.7)
/// * `max_tokens` - Maximum tokens to generate (default: 2000)
/// 
/// # Returns
/// 
/// Generated text
pub async fn generate_text(
    client: &OpenAIClient,
    prompt: &str,
    context: Option<&str>,
    model: LLMModel,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<String> {
    let url = format!("{}/chat/completions", client.base_url());
    
    let mut messages = Vec::new();
    if let Some(context) = context {
        messages.push(ChatMessage::system(context));
    }
    messages.push(ChatMessage::user(prompt));
    
    let request = ChatCompletionRequest {
        model: model.as_str().to_string(),
        messages,
        temperature: temperature.or(Some(0.7)),
        max_tokens: max_tokens.or(Some(2000)),
    };
    
    let response = reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {}", client.api_key()))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .context("Failed to send chat completion request")?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!("Chat completion API error ({}): {}", status, error_text);
    }
    
    let completion_response: ChatCompletionResponse = response
        .json()
        .await
        .context("Failed to parse chat completion response")?;
    
    if completion_response.choices.is_empty() {
        anyhow::bail!("No choices in response");
    }
    
    Ok(completion_response.choices[0].message.content.clone())
}

/// Generate script from Scene IR
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `scene_title` - Scene title
/// * `scene_summary` - Scene summary
/// * `scene_llm_label` - Scene llmLabel
/// * `characters` - Vector of (character_name, character_llm_label) tuples
/// * `model` - LLM model to use
/// 
/// # Returns
/// 
/// Generated script text
pub async fn generate_script_from_scene(
    client: &OpenAIClient,
    scene_title: &str,
    scene_summary: &str,
    scene_llm_label: Option<&str>,
    characters: &[(String, Option<String>)],
    model: LLMModel,
) -> Result<String> {
    let mut context = format!(
        "You are a scriptwriter for a cyberpunk story set in Tokyo 2026.\n\
        Write a script scene based on the following information.\n\n\
        Scene Title: {}\n\
        Scene Summary: {}\n",
        scene_title, scene_summary
    );
    
    if let Some(llm_label) = scene_llm_label {
        context.push_str(&format!("Scene Description: {}\n\n", llm_label));
    }
    
    if !characters.is_empty() {
        context.push_str("Characters:\n");
        for (name, llm_label) in characters {
            context.push_str(&format!("- {}: ", name));
            if let Some(label) = llm_label {
                context.push_str(label);
            }
            context.push_str("\n");
        }
        context.push_str("\n");
    }
    
    context.push_str(
        "Write a script scene in the following format:\n\
        [SCENE: Scene Title]\n\
        [LOCATION: Location description]\n\
        [CHARACTERS: Character list]\n\
        \n\
        [Dialogue and action descriptions]\n\
        \n\
        Include dialogue, action descriptions, and scene transitions."
    );
    
    let prompt = format!(
        "Write a script scene for '{}' based on the context above.",
        scene_title
    );
    
    generate_text(client, &prompt, Some(&context), model, Some(0.8), Some(3000)).await
}

/// Generate novel text from Scene IR
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `scene_title` - Scene title
/// * `scene_summary` - Scene summary
/// * `scene_llm_label` - Scene llmLabel
/// * `characters` - Vector of (character_name, character_llm_label) tuples
/// * `model` - LLM model to use
/// 
/// # Returns
/// 
/// Generated novel text
pub async fn generate_novel_from_scene(
    client: &OpenAIClient,
    scene_title: &str,
    scene_summary: &str,
    scene_llm_label: Option<&str>,
    characters: &[(String, Option<String>)],
    model: LLMModel,
) -> Result<String> {
    let mut context = format!(
        "You are a novelist writing a cyberpunk story set in Tokyo 2026.\n\
        Write a novel scene based on the following information.\n\n\
        Scene Title: {}\n\
        Scene Summary: {}\n",
        scene_title, scene_summary
    );
    
    if let Some(llm_label) = scene_llm_label {
        context.push_str(&format!("Scene Description: {}\n\n", llm_label));
    }
    
    if !characters.is_empty() {
        context.push_str("Characters:\n");
        for (name, llm_label) in characters {
            context.push_str(&format!("- {}: ", name));
            if let Some(label) = llm_label {
                context.push_str(label);
            }
            context.push_str("\n");
        }
        context.push_str("\n");
    }
    
    context.push_str(
        "Write a novel scene in third-person narrative style.\n\
        Include vivid descriptions of the setting, character actions, dialogue, and internal thoughts.\n\
        Create an immersive reading experience."
    );
    
    let prompt = format!(
        "Write a novel scene for '{}' based on the context above.",
        scene_title
    );
    
    generate_text(client, &prompt, Some(&context), model, Some(0.8), Some(4000)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY
    async fn test_generate_text() {
        let client = OpenAIClient::new().unwrap();
        let text = generate_text(
            &client,
            "Write a short cyberpunk scene.",
            Some("You are a creative writer."),
            LLMModel::Gpt35Turbo,
            Some(0.8),
            Some(500),
        )
        .await
        .unwrap();
        assert!(!text.is_empty());
    }
}
