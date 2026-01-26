/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/deepinfra
 * 
 * DeepInfra API integration for image generation
 */
use anyhow::Result;
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepInfraImageGenerationRequest {
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub model_id: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub num_inference_steps: Option<u32>,
    pub guidance_scale: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeepInfraImageGenerationResponse {
    pub images: Vec<String>, // Base64 encoded images
}

impl DeepInfraImageGenerationResponse {
    /// Decode base64 images to bytes
    pub fn decode_images(&self) -> Result<Vec<Vec<u8>>> {
        use base64::{Engine as _, engine::general_purpose};
        
        self.images
            .iter()
            .map(|base64_str| {
                general_purpose::STANDARD
                    .decode(base64_str)
                    .map_err(|e| anyhow::anyhow!("Failed to decode base64 image: {}", e))
            })
            .collect()
    }
}

pub struct DeepInfraService {
    client: Client,
    api_key: String,
}

impl DeepInfraService {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn generate_image(&self, request: DeepInfraImageGenerationRequest) -> Result<DeepInfraImageGenerationResponse> {
        let url = format!("https://api.deepinfra.com/v1/inference/{}", request.model_id);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;
        
        let result: DeepInfraImageGenerationResponse = response.json().await?;
        Ok(result)
    }
}

