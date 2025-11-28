//! OpenAI Images API Integration
//! 
//! Generate images from imagePrompt using DALL-E 3

use crate::OpenAIClient;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// Image generation model
#[derive(Debug, Clone, Copy)]
pub enum ImageModel {
    /// DALL-E 3 (default, highest quality)
    DallE3,
    /// DALL-E 2 (legacy)
    DallE2,
}

impl ImageModel {
    fn as_str(&self) -> &'static str {
        match self {
            ImageModel::DallE3 => "dall-e-3",
            ImageModel::DallE2 => "dall-e-2",
        }
    }
}

/// Image size for DALL-E 3
#[derive(Debug, Clone, Copy)]
pub enum ImageSize {
    /// 1024x1024 (square)
    Square1024,
    /// 1792x1024 (landscape)
    Landscape1792x1024,
    /// 1024x1792 (portrait)
    Portrait1024x1792,
}

impl ImageSize {
    fn as_str(&self) -> &'static str {
        match self {
            ImageSize::Square1024 => "1024x1024",
            ImageSize::Landscape1792x1024 => "1792x1024",
            ImageSize::Portrait1024x1792 => "1024x1792",
        }
    }
}

/// Image quality
#[derive(Debug, Clone, Copy)]
pub enum ImageQuality {
    /// Standard quality (faster, default)
    Standard,
    /// HD quality (slower, higher quality)
    Hd,
}

impl ImageQuality {
    fn as_str(&self) -> &'static str {
        match self {
            ImageQuality::Standard => "standard",
            ImageQuality::Hd => "hd",
        }
    }
}

/// Image generation request
#[derive(Debug, Serialize)]
struct ImageGenerationRequest {
    model: String,
    prompt: String,
    n: u32,
    size: String,
    quality: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    response_format: Option<String>,
}

/// Image generation response
#[derive(Debug, Deserialize)]
struct ImageGenerationResponse {
    data: Vec<ImageData>,
}

#[derive(Debug, Deserialize)]
struct ImageData {
    url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    revised_prompt: Option<String>,
}

/// Image generation result
#[derive(Debug, Clone)]
pub struct GeneratedImage {
    pub url: String,
    pub revised_prompt: Option<String>,
}

/// Generate image from prompt
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `prompt` - Image generation prompt (from imagePrompt)
/// * `model` - Image model to use
/// * `size` - Image size
/// * `quality` - Image quality
/// 
/// # Returns
/// 
/// Generated image URL and revised prompt
pub async fn generate_image(
    client: &OpenAIClient,
    prompt: &str,
    model: ImageModel,
    size: ImageSize,
    quality: ImageQuality,
) -> Result<GeneratedImage> {
    let url = format!("{}/images/generations", client.base_url());
    
    let request = ImageGenerationRequest {
        model: model.as_str().to_string(),
        prompt: prompt.to_string(),
        n: 1,
        size: size.as_str().to_string(),
        quality: quality.as_str().to_string(),
        response_format: Some("url".to_string()),
    };
    
    let response = reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {}", client.api_key()))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .context("Failed to send image generation request")?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!("Image generation API error ({}): {}", status, error_text);
    }
    
    let image_response: ImageGenerationResponse = response
        .json()
        .await
        .context("Failed to parse image generation response")?;
    
    if image_response.data.is_empty() {
        anyhow::bail!("No image data in response");
    }
    
    let image_data = &image_response.data[0];
    Ok(GeneratedImage {
        url: image_data.url.clone(),
        revised_prompt: image_data.revised_prompt.clone(),
    })
}

/// Generate image from Scene IR
/// 
/// Combines scene imagePrompt with character visual profiles and shot camera/lighting info
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `scene_prompt` - Scene imagePrompt
/// * `character_prompts` - Optional character imagePrompts
/// * `shot_info` - Optional shot camera/lighting info
/// * `size` - Image size
/// * `quality` - Image quality
/// 
/// # Returns
/// 
/// Generated image URL and revised prompt
pub async fn generate_image_from_scene(
    client: &OpenAIClient,
    scene_prompt: &str,
    character_prompts: Option<&[String]>,
    shot_info: Option<&str>,
    size: ImageSize,
    quality: ImageQuality,
) -> Result<GeneratedImage> {
    let mut prompt = scene_prompt.to_string();
    
    if let Some(char_prompts) = character_prompts {
        if !char_prompts.is_empty() {
            prompt.push_str(", ");
            prompt.push_str(&char_prompts.join(", "));
        }
    }
    
    if let Some(shot) = shot_info {
        prompt.push_str(", ");
        prompt.push_str(shot);
    }
    
    generate_image(client, &prompt, ImageModel::DallE3, size, quality).await
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY
    async fn test_generate_image() {
        let client = OpenAIClient::new().unwrap();
        let prompt = "neon Tokyo rooftop at night, holographic billboards, cool color palette";
        let image = generate_image(
            &client,
            prompt,
            ImageModel::DallE3,
            ImageSize::Square1024,
            ImageQuality::Standard,
        )
        .await
        .unwrap();
        assert!(!image.url.is_empty());
    }
}
