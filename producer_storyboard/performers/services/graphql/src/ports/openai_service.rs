/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/openai-graphql
 * 
 * OpenAI API integration for GraphQL service
 * Provides DALL-E image generation and GPT-4 scene description generation
 */
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationRequest {
    pub prompt: String,
    pub model: Option<String>, // 'dall-e-3', 'dall-e-2'
    pub size: Option<String>, // '1024x1024', '1792x1024', '1024x1792'
    pub quality: Option<String>, // 'standard', 'hd'
    pub n: Option<u32>, // number of images (1 for dall-e-3)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationResponse {
    pub image_url: String,
    pub revised_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneDescriptionRequest {
    pub context: Option<String>,
    pub previous_scenes: Vec<String>,
}

pub struct OpenAIService {
    api_key: String,
    client: reqwest::Client,
}

impl OpenAIService {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    /// Generate image using DALL-E API
    pub async fn generate_image(&self, request: ImageGenerationRequest) -> Result<ImageGenerationResponse> {
        let url = "https://api.openai.com/v1/images/generations";
        
        let mut body: HashMap<String, serde_json::Value> = HashMap::new();
        body.insert("prompt".to_string(), json!(request.prompt));
        
        if let Some(model) = request.model {
            body.insert("model".to_string(), json!(model));
        } else {
            body.insert("model".to_string(), json!("dall-e-3"));
        }
        
        if let Some(size) = request.size {
            body.insert("size".to_string(), json!(size));
        } else {
            body.insert("size".to_string(), json!("1024x1024"));
        }
        
        if let Some(quality) = request.quality {
            body.insert("quality".to_string(), json!(quality));
        }
        
        if let Some(n) = request.n {
            body.insert("n".to_string(), json!(n));
        }

        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("OpenAI API error: {}", error_text);
        }

        let json: serde_json::Value = response.json().await?;
        
        let data = json.get("data")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.get(0))
            .ok_or_else(|| anyhow::anyhow!("No image data in response"))?;
        
        let image_url = data.get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("No image URL in response"))?
            .to_string();
        
        let revised_prompt = data.get("revised_prompt")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Ok(ImageGenerationResponse {
            image_url,
            revised_prompt,
        })
    }

    /// Download image from URL and convert to bytes
    pub async fn download_image(&self, image_url: &str) -> Result<Vec<u8>> {
        let response = self.client
            .get(image_url)
            .send()
            .await?;

        if !response.status().is_success() {
            anyhow::bail!("Failed to download image: {}", response.status());
        }

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    /// Generate scene description using GPT-4
    pub async fn generate_scene_description(&self, request: SceneDescriptionRequest) -> Result<String> {
        let url = "https://api.openai.com/v1/chat/completions";
        
        let mut messages = Vec::new();
        messages.push(serde_json::json!({
            "role": "system",
            "content": "You are a creative video storyboard assistant. Generate concise, visual scene descriptions for video production."
        }));
        
        let mut user_content = String::new();
        if let Some(context) = request.context {
            user_content.push_str(&format!("Context: {}\n\n", context));
        }
        if !request.previous_scenes.is_empty() {
            user_content.push_str("Previous scenes:\n");
            for (i, scene) in request.previous_scenes.iter().enumerate() {
                user_content.push_str(&format!("Scene {}: {}\n", i + 1, scene));
            }
            user_content.push_str("\n");
        }
        user_content.push_str("Generate a new scene description that continues the story:");
        
        messages.push(serde_json::json!({
            "role": "user",
            "content": user_content
        }));

        let body = serde_json::json!({
            "model": "gpt-4",
            "messages": messages,
            "max_tokens": 200,
            "temperature": 0.7
        });

        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("OpenAI API error: {}", error_text);
        }

        let json: serde_json::Value = response.json().await?;
        
        let content = json.get("choices")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.get(0))
            .and_then(|choice| choice.get("message"))
            .and_then(|msg| msg.get("content"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("No content in response"))?;

        Ok(content.to_string())
    }
}

