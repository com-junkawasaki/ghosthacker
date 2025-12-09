/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/hume-graphql
 * 
 * Hume AI API integration for GraphQL service
 * Provides voice listing and speech generation
 */
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HumeVoice {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceListResponse {
    pub voices: Vec<HumeVoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechGenerationRequest {
    pub text: String,
    pub voice_id: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeechGenerationResponse {
    pub audio_url: Option<String>,
    pub audio_data: Option<String>, // Base64 encoded audio
}

pub struct HumeService {
    api_key: String,
    api_url: String,
    client: reqwest::Client,
}

impl HumeService {
    pub fn new(api_key: String) -> Self {
        let api_url = std::env::var("HUME_API_URL")
            .unwrap_or_else(|_| "https://api.hume.ai".to_string());
        
        Self {
            api_key,
            api_url,
            client: reqwest::Client::new(),
        }
    }

    /// List available voices from Hume AI
    pub async fn list_voices(&self) -> Result<Vec<HumeVoice>> {
        // Note: Actual endpoint may vary - needs verification with Hume AI documentation
        let url = format!("{}/v1/voices", self.api_url);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Hume AI API error ({}): {}", status, text));
        }

        // Try to parse as array of voices or wrapped response
        let text = response.text().await?;
        let voices: Vec<HumeVoice> = match serde_json::from_str::<Vec<HumeVoice>>(&text) {
            Ok(voices) => voices,
            Err(_) => {
                // If direct array fails, try wrapped response
                let wrapped: VoiceListResponse = serde_json::from_str(&text)?;
                wrapped.voices
            }
        };

        Ok(voices)
    }

    /// Get a specific voice by ID
    pub async fn get_voice(&self, voice_id: &str) -> Result<HumeVoice> {
        let url = format!("{}/v1/voices/{}", self.api_url, voice_id);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Hume AI API error ({}): {}", status, text));
        }

        let voice: HumeVoice = response.json().await?;
        Ok(voice)
    }

    /// Generate speech from text using Hume AI
    pub async fn generate_speech(
        &self,
        text: &str,
        voice_id: &str,
        language: Option<&str>,
    ) -> Result<Vec<u8>> {
        // Note: Actual endpoint and request format may vary - needs verification
        let url = format!("{}/v1/speech", self.api_url);
        
        let request_body = json!({
            "text": text,
            "voice_id": voice_id,
            "language": language.unwrap_or("ja"),
        });

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
            return Err(anyhow::anyhow!("Hume AI API error ({}): {}", status, text));
        }

        // Try to get audio data - could be in response body or URL
        let audio_data = response.bytes().await?;
        Ok(audio_data.to_vec())
    }
}

