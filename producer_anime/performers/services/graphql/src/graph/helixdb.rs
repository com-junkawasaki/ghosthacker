/**
 * HelixDB Client
 * HelixDB HTTP APIクライアント実装
 * 
 * @context {
 *   "@id": "ex:HelixDBClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphDatabase"
 * }
 */

use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, OnceLock};
use tracing::{error, info};

/// HelixDBクライアント
pub struct HelixDBClient {
    client: Client,
    base_url: String,
    api_key: Option<String>,
}

static CLIENT: OnceLock<Arc<HelixDBClient>> = OnceLock::new();

/// HelixDBクライアントを初期化
pub async fn initialize() -> Result<()> {
    let base_url = std::env::var("HELIXDB_URL")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());
    let api_key = std::env::var("HELIXDB_API_KEY").ok();

    info!("Initializing HelixDB client at {}", base_url);

    let client = HelixDBClient::new(base_url, api_key)?;
    
    // 接続テスト
    client.health_check().await?;

    CLIENT.set(Arc::new(client)).map_err(|_| {
        anyhow::anyhow!("HelixDB client already initialized")
    })?;

    info!("HelixDB client initialized successfully");
    Ok(())
}

/// HelixDBクライアントを取得
pub fn get_client() -> Result<Arc<HelixDBClient>> {
    CLIENT.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("HelixDB client not initialized. Call initialize() first.")
    })
}

impl HelixDBClient {
    pub fn new(base_url: String, api_key: Option<String>) -> Result<Self> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Self {
            client,
            base_url,
            api_key,
        })
    }

    /// ヘルスチェック
    pub async fn health_check(&self) -> Result<()> {
        let url = format!("{}/health", self.base_url);
        let mut request = self.client.get(&url);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Health check failed: {}", response.status()))
        }
    }

    /// ノードを作成
    pub async fn create_node(&self, node: &GraphNode) -> Result<String> {
        let url = format!("{}/api/v1/nodes", self.base_url);
        let mut request = self.client.post(&url).json(node);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            let result: CreateNodeResponse = response.json().await?;
            Ok(result.id)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to create node: {}", error_text);
            Err(anyhow::anyhow!("Failed to create node: {}", error_text))
        }
    }

    /// ノードを取得
    pub async fn get_node(&self, id: &str) -> Result<Option<GraphNode>> {
        let url = format!("{}/api/v1/nodes/{}", self.base_url, id);
        let mut request = self.client.get(&url);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status() == 404 {
            return Ok(None);
        }

        if response.status().is_success() {
            let node: GraphNode = response.json().await?;
            Ok(Some(node))
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to get node {}: {}", id, error_text);
            Err(anyhow::anyhow!("Failed to get node: {}", error_text))
        }
    }

    /// ノードを更新
    pub async fn update_node(&self, id: &str, node: &GraphNode) -> Result<()> {
        let url = format!("{}/api/v1/nodes/{}", self.base_url, id);
        let mut request = self.client.put(&url).json(node);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to update node {}: {}", id, error_text);
            Err(anyhow::anyhow!("Failed to update node: {}", error_text))
        }
    }

    /// ノードを削除
    pub async fn delete_node(&self, id: &str) -> Result<()> {
        let url = format!("{}/api/v1/nodes/{}", self.base_url, id);
        let mut request = self.client.delete(&url);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() || response.status() == 404 {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to delete node {}: {}", id, error_text);
            Err(anyhow::anyhow!("Failed to delete node: {}", error_text))
        }
    }

    /// エッジを作成
    pub async fn create_edge(&self, edge: &GraphEdge) -> Result<String> {
        let url = format!("{}/api/v1/edges", self.base_url);
        let mut request = self.client.post(&url).json(edge);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            let result: CreateEdgeResponse = response.json().await?;
            Ok(result.id)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to create edge: {}", error_text);
            Err(anyhow::anyhow!("Failed to create edge: {}", error_text))
        }
    }

    /// エッジを取得
    pub async fn get_edge(&self, id: &str) -> Result<Option<GraphEdge>> {
        let url = format!("{}/api/v1/edges/{}", self.base_url, id);
        let mut request = self.client.get(&url);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status() == 404 {
            return Ok(None);
        }

        if response.status().is_success() {
            let edge: GraphEdge = response.json().await?;
            Ok(Some(edge))
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to get edge {}: {}", id, error_text);
            Err(anyhow::anyhow!("Failed to get edge: {}", error_text))
        }
    }

    /// エッジを削除
    pub async fn delete_edge(&self, id: &str) -> Result<()> {
        let url = format!("{}/api/v1/edges/{}", self.base_url, id);
        let mut request = self.client.delete(&url);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() || response.status() == 404 {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to delete edge {}: {}", id, error_text);
            Err(anyhow::anyhow!("Failed to delete edge: {}", error_text))
        }
    }

    /// グラフクエリを実行（SPARQL風）
    pub async fn query(&self, query: &str) -> Result<Value> {
        let url = format!("{}/api/v1/query", self.base_url);
        let payload = serde_json::json!({
            "query": query
        });

        let mut request = self.client.post(&url).json(&payload);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            let result: Value = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Query failed: {}", error_text);
            Err(anyhow::anyhow!("Query failed: {}", error_text))
        }
    }

    /// ベクトル検索
    pub async fn vector_search(&self, query_vector: &[f32], limit: usize) -> Result<Vec<VectorSearchResult>> {
        let url = format!("{}/api/v1/vector/search", self.base_url);
        let payload = serde_json::json!({
            "vector": query_vector,
            "limit": limit
        });

        let mut request = self.client.post(&url).json(&payload);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            let result: VectorSearchResponse = response.json().await?;
            Ok(result.results)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Vector search failed: {}", error_text);
            Err(anyhow::anyhow!("Vector search failed: {}", error_text))
        }
    }

    /// ベクトルをノードに追加
    pub async fn add_vector_to_node(&self, node_id: &str, vector: &[f32]) -> Result<()> {
        let url = format!("{}/api/v1/nodes/{}/vector", self.base_url, node_id);
        let payload = serde_json::json!({
            "vector": vector
        });

        let mut request = self.client.post(&url).json(&payload);

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        
        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to add vector to node {}: {}", node_id, error_text);
            Err(anyhow::anyhow!("Failed to add vector: {}", error_text))
        }
    }
}

/// グラフノード
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: Option<String>,
    pub label: String,
    pub properties: Value,
    pub vector: Option<Vec<f32>>,
}

/// グラフエッジ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: Option<String>,
    pub source: String,
    pub target: String,
    pub label: String,
    pub properties: Value,
}

/// ノード作成レスポンス
#[derive(Debug, Serialize, Deserialize)]
struct CreateNodeResponse {
    id: String,
}

/// エッジ作成レスポンス
#[derive(Debug, Serialize, Deserialize)]
struct CreateEdgeResponse {
    id: String,
}

/// ベクトル検索結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorSearchResult {
    pub node_id: String,
    pub score: f32,
    pub node: Option<GraphNode>,
}

/// ベクトル検索レスポンス
#[derive(Debug, Serialize, Deserialize)]
struct VectorSearchResponse {
    results: Vec<VectorSearchResult>,
}

