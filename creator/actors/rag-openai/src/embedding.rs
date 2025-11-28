//! OpenAI Embeddings API Integration
//! 
//! Generate embeddings from text using OpenAI's embedding models

use crate::OpenAIClient;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// Embedding model options
#[derive(Debug, Clone, Copy)]
pub enum EmbeddingModel {
    /// text-embedding-ada-002 (1536 dimensions, default)
    Ada002,
    /// text-embedding-3-small (1536 dimensions)
    Small,
    /// text-embedding-3-large (3072 dimensions)
    Large,
}

impl EmbeddingModel {
    fn as_str(&self) -> &'static str {
        match self {
            EmbeddingModel::Ada002 => "text-embedding-ada-002",
            EmbeddingModel::Small => "text-embedding-3-small",
            EmbeddingModel::Large => "text-embedding-3-large",
        }
    }
    
    pub fn dimensions(&self) -> usize {
        match self {
            EmbeddingModel::Ada002 => 1536,
            EmbeddingModel::Small => 1536,
            EmbeddingModel::Large => 3072,
        }
    }
}

/// Embedding request
#[derive(Debug, Serialize)]
struct EmbeddingRequest {
    model: String,
    input: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    encoding_format: Option<String>,
}

/// Embedding response
#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
    model: String,
    usage: EmbeddingUsage,
}

#[derive(Debug, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
    index: usize,
}

#[derive(Debug, Deserialize)]
struct EmbeddingUsage {
    prompt_tokens: u32,
    total_tokens: u32,
}

/// Generate embedding from text
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `text` - Text to embed (from embedHint or llmLabel)
/// * `model` - Embedding model to use
/// 
/// # Returns
/// 
/// Vector of f32 values representing the embedding
pub async fn generate_embedding(
    client: &OpenAIClient,
    text: &str,
    model: EmbeddingModel,
) -> Result<Vec<f32>> {
    let url = format!("{}/embeddings", client.base_url());
    
    let request = EmbeddingRequest {
        model: model.as_str().to_string(),
        input: text.to_string(),
        encoding_format: Some("float".to_string()),
    };
    
    let response = reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {}", client.api_key()))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .context("Failed to send embedding request")?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!("Embedding API error ({}): {}", status, error_text);
    }
    
    let embedding_response: EmbeddingResponse = response
        .json()
        .await
        .context("Failed to parse embedding response")?;
    
    if embedding_response.data.is_empty() {
        anyhow::bail!("No embedding data in response");
    }
    
    Ok(embedding_response.data[0].embedding.clone())
}

/// Generate embeddings for multiple texts (batch)
/// 
/// # Arguments
/// 
/// * `client` - OpenAI client
/// * `texts` - Vector of texts to embed
/// * `model` - Embedding model to use
/// 
/// # Returns
/// 
/// Vector of embeddings (one per input text)
pub async fn generate_embeddings_batch(
    client: &OpenAIClient,
    texts: &[String],
    model: EmbeddingModel,
) -> Result<Vec<Vec<f32>>> {
    let url = format!("{}/embeddings", client.base_url());
    
    let request = serde_json::json!({
        "model": model.as_str(),
        "input": texts,
        "encoding_format": "float"
    });
    
    let response = reqwest::Client::new()
        .post(&url)
        .header("Authorization", format!("Bearer {}", client.api_key()))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .context("Failed to send batch embedding request")?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!("Embedding API error ({}): {}", status, error_text);
    }
    
    let embedding_response: EmbeddingResponse = response
        .json()
        .await
        .context("Failed to parse batch embedding response")?;
    
    // Sort by index to maintain order
    let mut embeddings: Vec<_> = embedding_response.data.into_iter().collect();
    embeddings.sort_by_key(|d| d.index);
    
    Ok(embeddings.into_iter().map(|d| d.embedding).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY
    async fn test_generate_embedding() {
        let client = OpenAIClient::new().unwrap();
        let text = "elite ethical hacker known as 'Ghost', operates in Tokyo underground network";
        let embedding = generate_embedding(&client, text, EmbeddingModel::Ada002).await.unwrap();
        assert_eq!(embedding.len(), 1536);
    }
}
