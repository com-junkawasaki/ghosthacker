/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/openai
 * 
 * OpenAI API integration for video generation
 */
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoGenerationRequest {
    pub prompt: String,
    pub model: Option<String>,
    pub duration: Option<u32>, // seconds
    pub aspect_ratio: Option<String>, // e.g., "16:9"
    pub resolution: Option<String>, // e.g., "1920x1080"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoGenerationResponse {
    pub job_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoStatusResponse {
    pub job_id: String,
    pub status: String, // 'pending', 'processing', 'completed', 'failed'
    pub video_url: Option<String>,
    pub error_message: Option<String>,
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

    /// Generate video from prompt using OpenAI API
    pub async fn generate_video(&self, request: VideoGenerationRequest) -> Result<VideoGenerationResponse> {
        let url = "https://api.openai.com/v1/videos/generations";
        
        let mut body = HashMap::new();
        body.insert("prompt", request.prompt);
        if let Some(model) = request.model {
            body.insert("model", model);
        }
        if let Some(duration) = request.duration {
            body.insert("duration", duration.to_string());
        }
        if let Some(aspect_ratio) = request.aspect_ratio {
            body.insert("aspect_ratio", aspect_ratio);
        }
        if let Some(resolution) = request.resolution {
            body.insert("resolution", resolution);
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
        
        // Note: OpenAI video generation API may return job_id for async processing
        // This is a placeholder implementation - actual API may differ
        let job_id = json.get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        
        Ok(VideoGenerationResponse {
            job_id,
            status: "pending".to_string(),
        })
    }

    /// Get video generation status
    pub async fn get_video_status(&self, job_id: &str) -> Result<VideoStatusResponse> {
        let url = format!("https://api.openai.com/v1/videos/generations/{}", job_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("OpenAI API error: {}", error_text);
        }

        let json: serde_json::Value = response.json().await?;
        
        let status = json.get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        
        let video_url = json.get("video_url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let error_message = json.get("error")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Ok(VideoStatusResponse {
            job_id: job_id.to_string(),
            status,
            video_url,
            error_message,
        })
    }

    /// Convert storyboard scenes to video generation prompt
    pub fn storyboard_to_prompt(_scenes: &[crate::service::storyboard_editor::SceneData]) -> String {
        // Combine scene descriptions into a coherent video prompt
        let scene_descriptions: Vec<String> = scenes
            .iter()
            .enumerate()
            .map(|(i, scene)| {
                format!("Scene {}: {}", i + 1, scene.text_description.as_deref().unwrap_or(""))
            })
            .collect();
        
        format!("Create a video with the following scenes:\n{}", scene_descriptions.join("\n"))
    }
}
