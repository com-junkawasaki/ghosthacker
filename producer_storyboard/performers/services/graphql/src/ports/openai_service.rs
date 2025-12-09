    /// Generate image using DALL-E API
    pub async fn generate_image(&self, request: ImageGenerationRequest) -> Result<ImageGenerationResponse> {
        // Use OpenRouter endpoint if using OpenRouter key (starts with sk-or-)
        // or standard OpenAI endpoint otherwise.
        // For this project, we are using OpenRouter.
        let url = "https://openrouter.ai/api/v1/images/generations";
        
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

        // Add site URL and app name for OpenRouter
        let response = self.client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://github.com/ghosthacker/producer_storyboard") // Required by OpenRouter
            .header("X-Title", "Producer Storyboard") // Required by OpenRouter
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            anyhow::bail!("OpenAI API error: {}", error_text);
        }

        let json: serde_json::Value = response.json().await?;
        
        let data = json.get("data")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.get(0))
            .ok_or_else(|| anyhow::anyhow!("No image data in response"))?;
        
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
