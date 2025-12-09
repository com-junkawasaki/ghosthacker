/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/translation-graphql
 * 
 * Translation service using OpenAI GPT-4
 * Provides multi-language translation for dialogues
 */
use anyhow::Result;
use serde_json::json;

pub struct TranslationService {
    api_key: String,
    client: reqwest::Client,
}

impl TranslationService {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: reqwest::Client::new(),
        }
    }

    /// Translate text from source language to target language
    pub async fn translate_text(
        &self,
        text: &str,
        source_lang: &str,
        target_lang: &str,
    ) -> Result<String> {
        let lang_names = match (source_lang, target_lang) {
            ("ja", "en") => ("Japanese", "English"),
            ("ja", "hi") => ("Japanese", "Hindi"),
            ("en", "ja") => ("English", "Japanese"),
            ("en", "hi") => ("English", "Hindi"),
            ("hi", "ja") => ("Hindi", "Japanese"),
            ("hi", "en") => ("Hindi", "English"),
            _ => (source_lang, target_lang),
        };

        let prompt = format!(
            "Translate the following {} text to {}:\n\n{}",
            lang_names.0, lang_names.1, text
        );

        let url = "https://api.openai.com/v1/chat/completions";
        
        let request_body = json!({
            "model": "gpt-4",
            "messages": [
                {
                    "role": "system",
                    "content": format!("You are a professional translator. Translate the given {} text to {} accurately, preserving the meaning and tone.", lang_names.0, lang_names.1)
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 500
        });

        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("OpenAI API error ({}): {}", status, text));
        }

        let result: serde_json::Value = response.json().await?;
        let translated_text = result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid response from OpenAI API"))?
            .trim()
            .to_string();

        Ok(translated_text)
    }
}

