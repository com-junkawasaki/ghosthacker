/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/openai-graphql
 * 
 * OpenAI API integration for GraphQL service
 * Provides image generation (DALL-E) and scene description generation (GPT-4)
 */
use anyhow::Result;
use serde_json::{json, Value as JsonValue};

#[derive(Debug, Clone)]
pub struct ImageGenerationRequest {
    pub prompt: String,
    pub model: Option<String>,
    pub size: Option<String>,
    pub quality: Option<String>,
    pub n: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct ImageGenerationResponse {
    pub image_url: String,
    pub revised_prompt: Option<String>,
}

#[derive(Debug, Clone)]
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

    /// Generate image using DALL-E API (via OpenRouter or OpenAI direct)
    /// OpenRouter uses chat/completions endpoint with modalities parameter
    /// OpenAI direct uses images/generations endpoint
    pub async fn generate_image(&self, request: ImageGenerationRequest) -> Result<ImageGenerationResponse> {
        // Check if API key is OpenRouter key (starts with sk-or-)
        let is_openrouter = self.api_key.starts_with("sk-or-");
        
        // Debug logging (using println! for Docker logs visibility)
        println!("[OpenAI Service] Starting image generation");
        println!("[OpenAI Service] Is OpenRouter: {}", is_openrouter);
        println!("[OpenAI Service] Prompt: {}", request.prompt);
        println!("[OpenAI Service] Model: {:?}", request.model);
        
        if is_openrouter {
            // OpenRouter uses chat/completions endpoint with modalities=["image", "text"]
            let url = "https://openrouter.ai/api/v1/chat/completions";
            
            // Use a model that supports image generation (e.g., google/gemini-pro-vision or similar)
            // Default to a model that supports image generation
            let model = request.model.as_deref().unwrap_or("google/gemini-2.0-flash-exp:free");
            
            println!("[OpenAI Service] Using OpenRouter endpoint: {}", url);
            println!("[OpenAI Service] Using model: {}", model);
            
            let mut body = json!({
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": request.prompt
                    }
                ],
                "modalities": ["image", "text"],
                "stream": false
            });
            
            // Add image config for aspect ratio if specified
            if let Some(size) = &request.size {
                // Parse size like "1024x1024" to aspect ratio
                let aspect_ratio = match size.as_str() {
                    "1024x1024" => "1:1",
                    "1024x1792" => "2:3",
                    "1792x1024" => "3:2",
                    _ => "1:1", // Default
                };
                body["image_config"] = json!({
                    "aspect_ratio": aspect_ratio
                });
                println!("[OpenAI Service] Aspect ratio: {}", aspect_ratio);
            }
            
            println!("[OpenAI Service] Request body: {}", serde_json::to_string(&body).unwrap_or_default());
            
            let response = self.client
                .post(url)
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .header("HTTP-Referer", "https://github.com/ghosthacker/producer_storyboard")
                .header("X-Title", "Producer Storyboard")
                .json(&body)
                .send()
                .await?;

            let status = response.status();
            println!("[OpenAI Service] Response status: {}", status.as_u16());
            
            // Read response body before checking status to ensure we can read it
            let response_text = response.text().await.unwrap_or_else(|e| {
                format!("Failed to read response body: {}", e)
            });
            
            println!("[OpenAI Service] Response body length: {} bytes", response_text.len());
            println!("[OpenAI Service] Response body (first 1000 chars): {}", 
                if response_text.len() > 1000 { 
                    format!("{}...", &response_text[..1000]) 
                } else { 
                    response_text.clone() 
                }
            );
            
            if !status.is_success() {
                let detailed_error = if let Ok(json_err) = serde_json::from_str::<serde_json::Value>(&response_text) {
                    println!("[OpenAI Service] Parsed error JSON: {}", serde_json::to_string(&json_err).unwrap_or_default());
                    if let Some(error_obj) = json_err.get("error") {
                        if let Some(message) = error_obj.get("message").and_then(|v| v.as_str()) {
                            format!("{}", message)
                        } else if let Some(code) = error_obj.get("code").and_then(|v| v.as_str()) {
                            format!("Error code: {}", code)
                        } else {
                            format!("Error object: {}", serde_json::to_string(error_obj).unwrap_or_default())
                        }
                    } else {
                        response_text.clone()
                    }
                } else {
                    response_text.clone()
                };
                
                println!("[OpenAI Service] Error details: {}", detailed_error);
                anyhow::bail!("OpenRouter API error (HTTP {}): {}", status.as_u16(), detailed_error);
            }

            let json: serde_json::Value = serde_json::from_str(&response_text)
                .map_err(|e| anyhow::anyhow!("Failed to parse response JSON: {}. Response: {}", e, response_text))?;
            
            println!("[OpenAI Service] Parsed response JSON successfully");
            println!("[OpenAI Service] Response structure: choices={}, message={}, images={}", 
                json.get("choices").is_some(),
                json.get("choices").and_then(|v| v.as_array()).and_then(|arr| arr.get(0)).and_then(|c| c.get("message")).is_some(),
                json.get("choices").and_then(|v| v.as_array()).and_then(|arr| arr.get(0)).and_then(|c| c.get("message")).and_then(|m| m.get("images")).is_some()
            );
            
            // OpenRouter response format: choices[0].message.images[0].image_url.url
            let image_url = json.get("choices")
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.get(0))
                .and_then(|choice| choice.get("message"))
                .and_then(|msg| msg.get("images"))
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.get(0))
                .and_then(|img| img.get("image_url"))
                .and_then(|url_obj| url_obj.get("url"))
                .and_then(|v| v.as_str())
                .ok_or_else(|| {
                    let full_response = serde_json::to_string(&json).unwrap_or_default();
                    println!("[OpenAI Service] Full response: {}", full_response);
                    anyhow::anyhow!("No image URL in OpenRouter response. Response structure: {}", full_response)
                })?
                .to_string();
            
            println!("[OpenAI Service] Image URL extracted: {}", image_url);
            
            // OpenRouter doesn't provide revised_prompt in the same format
            let revised_prompt = None;

            Ok(ImageGenerationResponse {
                image_url,
                revised_prompt,
            })
        } else {
            // OpenAI direct endpoint
            let url = "https://api.openai.com/v1/images/generations";
            
            let mut body = json!({
                "prompt": request.prompt,
                "n": request.n.unwrap_or(1),
                "size": request.size.unwrap_or_else(|| "1024x1024".to_string()),
            });

            // DALL-E 3 specific parameters
            if let Some(model) = &request.model {
                body["model"] = json!(model);
                if model == "dall-e-3" {
                    body["quality"] = json!(request.quality.unwrap_or_else(|| "standard".to_string()));
                }
            }

            println!("[OpenAI Service] Using OpenAI direct endpoint: {}", url);
            println!("[OpenAI Service] Request body: {}", serde_json::to_string(&body).unwrap_or_default());
            
            let response = self.client
                .post(url)
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await?;

            let status = response.status();
            println!("[OpenAI Service] Response status: {}", status.as_u16());
            
            // Read response body before checking status
            let response_text = response.text().await.unwrap_or_else(|e| {
                format!("Failed to read response body: {}", e)
            });
            
            println!("[OpenAI Service] Response body length: {} bytes", response_text.len());
            println!("[OpenAI Service] Response body (first 1000 chars): {}", 
                if response_text.len() > 1000 { 
                    format!("{}...", &response_text[..1000]) 
                } else { 
                    response_text.clone() 
                }
            );
            
            if !status.is_success() {
                let detailed_error = if let Ok(json_err) = serde_json::from_str::<serde_json::Value>(&response_text) {
                    println!("[OpenAI Service] Parsed error JSON: {}", serde_json::to_string(&json_err).unwrap_or_default());
                    if let Some(error_obj) = json_err.get("error") {
                        if let Some(message) = error_obj.get("message").and_then(|v| v.as_str()) {
                            format!("{}", message)
                        } else if let Some(code) = error_obj.get("code").and_then(|v| v.as_str()) {
                            format!("Error code: {}", code)
                        } else {
                            format!("Error object: {}", serde_json::to_string(error_obj).unwrap_or_default())
                        }
                    } else {
                        response_text.clone()
                    }
                } else {
                    response_text.clone()
                };
                
                println!("[OpenAI Service] Error details: {}", detailed_error);
                anyhow::bail!("OpenAI API error (HTTP {}): {}", status.as_u16(), detailed_error);
            }

            let json: serde_json::Value = serde_json::from_str(&response_text)
                .map_err(|e| anyhow::anyhow!("Failed to parse response JSON: {}. Response: {}", e, response_text))?;
            
            println!("[OpenAI Service] Parsed response JSON successfully");
            
            let data = json.get("data")
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.get(0))
                .ok_or_else(|| {
                    if let Some(error) = json.get("error") {
                        anyhow::anyhow!("API error: {}", serde_json::to_string(error).unwrap_or_default())
                    } else {
                        anyhow::anyhow!("No image data in response. Response: {}", serde_json::to_string(&json).unwrap_or_default())
                    }
                })?;
            
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
    }

    /// Download image from URL and return as bytes
    pub async fn download_image(&self, image_url: &str) -> Result<Vec<u8>> {
        let response = self.client
            .get(image_url)
            .send()
            .await?;

        if !response.status().is_success() {
            anyhow::bail!("Failed to download image: HTTP {}", response.status());
        }

        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }

    /// Generate scene description using GPT-4 (via OpenRouter)
    pub async fn generate_scene_description(&self, request: SceneDescriptionRequest) -> Result<String> {
        let url = "https://openrouter.ai/api/v1/chat/completions"; // OpenRouter endpoint
        
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
            .header("HTTP-Referer", "https://github.com/ghosthacker/producer_storyboard")
            .header("X-Title", "Producer Storyboard")
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
