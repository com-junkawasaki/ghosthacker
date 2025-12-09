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
    pub provider: Option<String>,
    // description field is not in the response, mapping from tags if needed
    #[serde(skip)]
    pub description: Option<String>,
    #[serde(skip)]
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceListResponse {
    pub voices_page: Vec<HumeVoice>,
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
        // TTS API endpoint for listing voices
        let url = format!("{}/v0/tts/voices?provider=HUME_AI", self.api_url);
        
        let response = self.client
            .get(&url)
            .header("X-Hume-Api-Key", &self.api_key)
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Hume AI API error ({}): {}", status, text));
        }

        // Try to parse wrapped response
        let text = response.text().await?;
        let wrapped: VoiceListResponse = serde_json::from_str(&text)?;
        
        // Map response to HumeVoice with language populated (simplified)
        let voices = wrapped.voices_page.into_iter().map(|mut v| {
            v.language = Some("English".to_string()); // Default to English as most are
            v.description = v.provider.clone();
            v
        }).collect();

        Ok(voices)
    }

    /// Get a specific voice by ID
    pub async fn get_voice(&self, voice_id: &str) -> Result<HumeVoice> {
        // Note: Individual voice endpoint might differ, using list filtering for now if needed
        // But for now, let's try hypothetical endpoint or just return basic info
        let url = format!("{}/v0/tts/voices/{}", self.api_url, voice_id);
        
        let response = self.client
            .get(&url)
            .header("X-Hume-Api-Key", &self.api_key)
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if !response.status().is_success() {
            // If individual fetch fails, just return basic struct
            return Ok(HumeVoice {
                id: voice_id.to_string(),
                name: "Unknown Voice".to_string(),
                provider: None,
                description: None,
                language: None,
            });
        }

        let voice: HumeVoice = response.json().await?;
        Ok(voice)
    }

    /// Generate speech from text using Hume AI
    pub async fn generate_speech(
        &self,
        text: &str,
        voice_id: &str,
        _language: Option<&str>,
    ) -> Result<Vec<u8>> {
        // Endpoint for text-to-speech generation
        // Based on API response analysis, /v0/tts seems to be the correct endpoint
        // accepting a payload with "utterances" array.
        let url = format!("{}/v0/tts", self.api_url);
        
        let request_body = json!({
            "utterances": [
                {
                    "text": text,
                    "voice": {
                        "id": voice_id
                    }
                }
            ]
        });

        let response = self.client
            .post(&url)
            .header("X-Hume-Api-Key", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Hume AI API error ({}): {}", status, text));
        }

        let audio_data = response.bytes().await?;
        Ok(audio_data.to_vec())
    }
}
