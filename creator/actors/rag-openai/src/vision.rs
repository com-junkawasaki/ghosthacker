//! OpenAI Vision API Integration
//! 
//! Analyze images using GPT-4 Vision and update IR

use crate::OpenAIClient;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// Vision model
#[derive(Debug, Clone, Copy)]
pub enum VisionModel {
    /// GPT-4 Vision (default)
    Gpt4Vision,
}

impl VisionModel {
    fn as_str(&self) -> &'static str {
        match self {
            VisionModel::Gpt4Vision => "gpt-4-vision-preview",
        }
    }
}

/// Image content for vision API
#[derive(Debug, Clone, Serialize)]
pub struct ImageContent {
    #[serde(rename = "type")]
    content_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    image_url: Option<ImageUrl>,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
}

impl ImageContent {
    pub fn from_url(url: &str) -> Self {
        Self {
            content_type: "image_url".to_string(),
            image_url: Some(ImageUrl {
                url: url.to_string(),
            }),
            text: None,
        }
    }
    
    pub fn text(text: &str) -> Self {
        Self {
            content_type: "text".to_string(),
            image_url: None,
            text: Some(text.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct ImageUrl {
    url: String,
}

/// Vision analysis request
#[derive(Debug, Serialize)]
struct VisionRequest {
    model: String,
    messages: Vec<VisionMessage>,
    max_tokens: u32,
}

#[derive(Debug, Serialize)]
struct VisionMessage {
    role: String,
    content: Vec<ImageContent>,
}

/// Vision analysis response
#[derive(Debug, Deserialize)]
struct VisionResponse {
    choices: Vec<VisionChoice>,
}

#[derive(Debug, Deserialize)]
struct VisionChoice {
    message: VisionMessageResponse,
}

#[derive(Debug, Deserialize)]
struct VisionMessageResponse {
    content: String,
}

/// Image analysis result
#[derive(Debug, Clone)]
pub struct ImageAnalysis {
    pub description: String,
    pub visual_elements: Vec<String>,
    pub suggested_updates: Vec<String>,
}

/// Analyze image and extract IR-relevant information
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `image_url` - URL of the image to analyze
/// * `context` - Optional context about what to look for
/// 
/// # Returns
/// 
/// Analysis result with description and suggested IR updates
pub async fn analyze_image(
    client: &OpenAIClient,
    image_url: &str,
    context: Option<&str>,
) -> Result<ImageAnalysis> {
    let url = format!("{}/chat/completions", client.base_url());
    
    let mut content = Vec::new();
    
    if let Some(ctx) = context {
        content.push(ImageContent::text(ctx));
    }
    
    content.push(ImageContent::text(
        "Analyze this image and provide:\n\
        1. A detailed description of what you see\n\
        2. Visual elements (colors, lighting, composition, style)\n\
        3. Suggestions for updating the visual profile or imagePrompt in the IR\n\n\
        Format your response as JSON with keys: description, visual_elements (array), suggested_updates (array)."
    ));
    
    content.push(ImageContent::from_url(image_url));
    
    let request = VisionRequest {
        model: VisionModel::Gpt4Vision.as_str().to_string(),
        messages: vec![VisionMessage {
            role: "user".to_string(),
            content,
        }],
        max_tokens: 1000,
    };
    
    let response = reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {}", client.api_key()))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .context("Failed to send vision analysis request")?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!("Vision API error ({}): {}", status, error_text);
    }
    
    let vision_response: VisionResponse = response
        .json()
        .await
        .context("Failed to parse vision response")?;
    
    if vision_response.choices.is_empty() {
        anyhow::bail!("No choices in vision response");
    }
    
    let content = &vision_response.choices[0].message.content;
    
    // Try to parse as JSON, fallback to plain text
    let analysis = if let Ok(json) = serde_json::from_str::<serde_json::Value>(content) {
        ImageAnalysis {
            description: json["description"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            visual_elements: json["visual_elements"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            suggested_updates: json["suggested_updates"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
        }
    } else {
        // Fallback: treat entire response as description
        ImageAnalysis {
            description: content.clone(),
            visual_elements: Vec::new(),
            suggested_updates: Vec::new(),
        }
    };
    
    Ok(analysis)
}

/// Analyze image and suggest IR updates for Character visualProfile
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `image_url` - URL of the generated character image
/// * `character_name` - Character name for context
/// 
/// # Returns
/// 
/// Analysis with suggestions for visualProfile updates
pub async fn analyze_character_image(
    client: &OpenAIClient,
    image_url: &str,
    character_name: &str,
) -> Result<ImageAnalysis> {
    let context = format!(
        "This is a generated image of the character '{}'.\n\
        Analyze the visual appearance and suggest updates to the visualProfile:\n\
        - appearance array (clothing, features, etc.)\n\
        - colorTheme\n\
        - Any other visual characteristics",
        character_name
    );
    
    analyze_image(client, image_url, Some(&context)).await
}

/// Analyze image and suggest IR updates for Scene/Shot
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `image_url` - URL of the generated scene/shot image
/// * `scene_title` - Scene title for context
/// 
/// # Returns
/// 
/// Analysis with suggestions for imagePrompt and visual updates
pub async fn analyze_scene_image(
    client: &OpenAIClient,
    image_url: &str,
    scene_title: &str,
) -> Result<ImageAnalysis> {
    let context = format!(
        "This is a generated image for the scene '{}'.\n\
        Analyze the visual composition and suggest:\n\
        - Improvements to the imagePrompt\n\
        - Lighting and color palette notes\n\
        - Camera angle and composition notes\n\
        - Any visual elements that should be added to the scene description",
        scene_title
    );
    
    analyze_image(client, image_url, Some(&context)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY and image URL
    async fn test_analyze_image() {
        let client = OpenAIClient::new().unwrap();
        let image_url = "https://example.com/image.jpg";
        let analysis = analyze_image(&client, image_url, None).await.unwrap();
        assert!(!analysis.description.is_empty());
    }
}
