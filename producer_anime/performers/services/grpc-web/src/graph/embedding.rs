/**
 * Embedding Service
 * OpenAI埋め込みAPI統合
 * 
 * @context {
 *   "@id": "ex:EmbeddingService",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:VectorEmbedding"
 * }
 */

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, OnceLock};
use tracing::{error, info};

use super::jsonld::JsonLdProcessor;

static CLIENT: OnceLock<Arc<EmbeddingService>> = OnceLock::new();

/// 埋め込みサービスを初期化
pub async fn initialize() -> Result<()> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .context("OPENAI_API_KEY environment variable not set")?;

    let service = EmbeddingService::new(api_key)?;
    
    CLIENT.set(Arc::new(service)).map_err(|_| {
        anyhow::anyhow!("Embedding service already initialized")
    })?;

    info!("Embedding service initialized successfully");
    Ok(())
}

/// 埋め込みサービスを取得
pub fn get_service() -> Result<Arc<EmbeddingService>> {
    CLIENT.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("Embedding service not initialized. Call initialize() first.")
    })
}

/// 埋め込みサービス
pub struct EmbeddingService {
    client: Client,
    api_key: String,
    model: String,
}

impl EmbeddingService {
    pub fn new(api_key: String) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()?;

        Ok(Self {
            client,
            api_key,
            model: "text-embedding-3-large".to_string(),
        })
    }

    /// テキストを埋め込みベクトルに変換
    pub async fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        let url = "https://api.openai.com/v1/embeddings";
        
        let payload = serde_json::json!({
            "model": self.model,
            "input": text
        });

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI API error: {}", error_text);
            return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
        }

        let result: EmbeddingResponse = response.json().await?;
        
        if let Some(data) = result.data.first() {
            Ok(data.embedding.clone())
        } else {
            Err(anyhow::anyhow!("No embedding data returned"))
        }
    }

    /// JSON-LDを埋め込みベクトルに変換（context=embedded形式で保持）
    pub async fn embed_jsonld(&self, jsonld: &Value) -> Result<Vec<f32>> {
        // JSON-LDからテキストを抽出（context情報も含む）
        let text = JsonLdProcessor::extract_text_for_embedding(jsonld);
        
        // 正規化されたJSON-LDも含める（構造情報を保持）
        let normalized = JsonLdProcessor::normalize_with_embedded_context(jsonld)?;
        let json_text = serde_json::to_string(&normalized)?;
        
        // テキストとJSON構造の両方を埋め込み
        let combined_text = format!("{}\n\nJSON Structure:\n{}", text, json_text);
        
        self.embed_text(&combined_text).await
    }

    /// バッチでテキストを埋め込みベクトルに変換
    pub async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let url = "https://api.openai.com/v1/embeddings";
        
        let payload = serde_json::json!({
            "model": self.model,
            "input": texts
        });

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI API error: {}", error_text);
            return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
        }

        let result: EmbeddingResponse = response.json().await?;
        
        Ok(result.data.into_iter().map(|item| item.embedding).collect())
    }

    /// バッチでJSON-LDを埋め込みベクトルに変換
    pub async fn embed_jsonld_batch(&self, jsonlds: &[Value]) -> Result<Vec<Vec<f32>>> {
        let mut texts = Vec::new();
        
        for jsonld in jsonlds {
            let text = JsonLdProcessor::extract_text_for_embedding(jsonld);
            let normalized = JsonLdProcessor::normalize_with_embedded_context(jsonld)?;
            let json_text = serde_json::to_string(&normalized)?;
            texts.push(format!("{}\n\nJSON Structure:\n{}", text, json_text));
        }
        
        self.embed_batch(&texts).await
    }
}

/// 埋め込みレスポンス
#[derive(Debug, Serialize, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
    model: String,
    usage: Usage,
}

/// 埋め込みデータ
#[derive(Debug, Serialize, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
    index: usize,
}

/// 使用量
#[derive(Debug, Serialize, Deserialize)]
struct Usage {
    prompt_tokens: usize,
    total_tokens: usize,
}

