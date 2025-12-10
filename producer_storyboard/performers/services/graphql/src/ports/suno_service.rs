/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/suno-graphql
 * 
 * Suno AI API integration for GraphQL service
 * Provides music generation capabilities
 */
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SunoTask {
    pub task_id: String,
    pub status: String,
    pub audio_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SunoTaskStatus {
    pub task_id: String,
    pub status: String, // "pending", "generating", "completed", "failed"
    pub audio_url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SunoCreateRequest {
    #[serde(rename = "custom_mode")]
    pub custom_mode: Option<bool>,
    #[serde(rename = "gpt_description_prompt")]
    pub gpt_description_prompt: String,
    #[serde(rename = "make_instrumental")]
    pub make_instrumental: Option<bool>,
    pub mv: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SunoCreateResponse {
    pub task_id: String,
    pub status: String,
}

pub struct SunoService {
    api_key: String,
    api_url: String,
    client: reqwest::Client,
}

impl SunoService {
    pub fn new(api_key: String) -> Self {
        let api_url = std::env::var("SUNO_API_URL")
            .unwrap_or_else(|_| "https://api.sunoapi.org".to_string());
        
        Self {
            api_key,
            api_url,
            client: reqwest::Client::new(),
        }
    }

    /// Generate music from a text prompt using Suno API
    pub async fn generate_music(
        &self,
        prompt: &str,
        custom_mode: Option<bool>,
        make_instrumental: Option<bool>,
        mv: Option<&str>,
    ) -> Result<SunoTask> {
        let url = format!("{}/v1/suno/create", self.api_url);
        
        let request_body = SunoCreateRequest {
            custom_mode: custom_mode.or(Some(true)),
            gpt_description_prompt: prompt.to_string(),
            make_instrumental: make_instrumental.or(Some(false)),
            mv: mv.map(|s| s.to_string()),
        };

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Suno API error ({}): {}", status, text));
        }

        let create_response: SunoCreateResponse = response.json().await?;
        
        Ok(SunoTask {
            task_id: create_response.task_id,
            status: create_response.status,
            audio_url: None,
        })
    }

    /// Get the status of a music generation task
    pub async fn get_task_status(&self, task_id: &str) -> Result<SunoTaskStatus> {
        let url = format!("{}/v1/suno/task/{}", self.api_url, task_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Suno API error ({}): {}", status, text));
        }

        let status_response: SunoTaskStatus = response.json().await?;
        Ok(status_response)
    }

    /// Download audio file from Suno API
    pub async fn download_audio(&self, audio_url: &str) -> Result<Vec<u8>> {
        let response = self.client
            .get(audio_url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Suno API error ({}): {}", status, text));
        }

        let audio_data = response.bytes().await?;
        Ok(audio_data.to_vec())
    }
}
