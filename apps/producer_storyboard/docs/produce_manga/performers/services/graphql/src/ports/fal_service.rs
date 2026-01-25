/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/fal-ai
 * 
 * fal.ai API integration for image generation
 */
use anyhow::Result;
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize)]
pub struct FalImageGenerationRequest {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub model_id: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub num_images: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FalImageGenerationResponse {
    pub images: Vec<FalImage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FalImage {
    pub url: String,
    pub content_type: String,
    pub width: u32,
    pub height: u32,
}

pub struct FalService {
    client: Client,
    api_key: String,
}

impl FalService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn generate_image(&self, request: FalImageGenerationRequest) -> Result<FalImageGenerationResponse> {
        let url = format!("https://fal.run/models/{}/inference", request.model_id);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Key {}", self.api_key))
            .json(&request)
            .send()
            .await?;
        
        let result: FalImageGenerationResponse = response.json().await?;
        Ok(result)
    }

    /// Download image from URL and return as bytes
    pub async fn download_image(&self, image_url: &str) -> Result<Vec<u8>> {
        let response = self.client
            .get(image_url)
            .send()
            .await?;
        
        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    pub async fn list_models(&self) -> Result<Vec<FalModel>> {
        let url = "https://fal.run/models";
        
        let response = self.client
            .get(url)
            .header("Authorization", format!("Key {}", self.api_key))
            .send()
            .await?;
        
        let models: Vec<FalModel> = response.json().await?;
        Ok(models)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FalModel {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub preview_image_url: Option<String>,
    pub model_type: Option<String>,
}

