/**
 * Graph RAG Service
 * Graph RAGエンジン実装
 * 
 * @context {
 *   "@id": "ex:GraphRagService",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphRAG"
 * }
 */

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, OnceLock};
use tracing::{error, info};

use super::helixdb::{get_client, HelixDBClient};
use super::embedding::{get_service, EmbeddingService};
use super::jsonld::JsonLdProcessor;

static SERVICE: OnceLock<Arc<GraphRagService>> = OnceLock::new();

/// Graph RAGサービスを初期化
pub async fn initialize() -> Result<()> {
    let helixdb = get_client()?;
    let embedding = get_service()?;
    
    let service = GraphRagService::new(helixdb, embedding)?;
    
    SERVICE.set(Arc::new(service)).map_err(|_| {
        anyhow::anyhow!("Graph RAG service already initialized")
    })?;

    info!("Graph RAG service initialized successfully");
    Ok(())
}

/// Graph RAGサービスを取得
pub fn get_rag_service() -> Result<Arc<GraphRagService>> {
    SERVICE.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("Graph RAG service not initialized. Call initialize() first.")
    })
}

/// Graph RAGサービス
pub struct GraphRagService {
    helixdb: Arc<HelixDBClient>,
    embedding: Arc<EmbeddingService>,
    openai_client: Client,
    openai_api_key: String,
}

impl GraphRagService {
    pub fn new(helixdb: Arc<HelixDBClient>, embedding: Arc<EmbeddingService>) -> Result<Self> {
        let openai_api_key = std::env::var("OPENAI_API_KEY")
            .context("OPENAI_API_KEY environment variable not set")?;

        let openai_client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()?;

        Ok(Self {
            helixdb,
            embedding,
            openai_client,
            openai_api_key,
        })
    }

    /// Graph RAGクエリを実行
    pub async fn query(&self, query: &str, project_id: Option<&str>) -> Result<String> {
        // 1. クエリを理解（自然言語→グラフクエリ）
        let graph_query = self.understand_query(query).await?;

        // 2. 関連ノード・エッジを検索（グラフ+ベクトル）
        let context = self.retrieve_context(query, &graph_query, project_id).await?;

        // 3. LLMにプロンプトを送信
        let response = self.generate_response(query, &context).await?;

        Ok(response)
    }

    /// クエリを理解（自然言語→グラフクエリ）
    async fn understand_query(&self, query: &str) -> Result<String> {
        // 簡易的な実装：実際にはLLMを使ってクエリを理解し、グラフクエリに変換
        // ここでは、クエリをそのまま使用（実際の実装ではLLMを使用）
        
        // プロンプトを構築
        let prompt = format!(
            r#"You are a graph query assistant. Convert the following natural language query into a graph query format.

Natural language query: {}

Please provide a graph query that can be used to search for relevant nodes and edges in an RDF graph.
Focus on extracting entities, relationships, and properties mentioned in the query.

Return only the graph query, no additional explanation."#,
            query
        );

        // OpenAI APIを呼び出し
        let response = self
            .openai_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.openai_api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": "gpt-4",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a graph query assistant that converts natural language queries into graph queries."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 500
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI API error: {}", error_text);
            return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
        }

        let result: ChatCompletionResponse = response.json().await?;
        
        if let Some(choice) = result.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err(anyhow::anyhow!("No response from OpenAI"))
        }
    }

    /// コンテキストを取得（グラフ+ベクトル検索）
    async fn retrieve_context(
        &self,
        query: &str,
        graph_query: &str,
        project_id: Option<&str>,
    ) -> Result<Vec<ContextNode>> {
        let mut context_nodes = Vec::new();

        // 1. グラフクエリを実行
        if let Ok(result) = self.helixdb.query(graph_query).await {
            // クエリ結果からノードを抽出
            if let Some(nodes) = result.get("nodes").and_then(|n| n.as_array()) {
                for node in nodes {
                    if let Some(node_obj) = node.as_object() {
                        if let Some(id) = node_obj.get("id").and_then(|v| v.as_str()) {
                            if let Ok(Some(graph_node)) = self.helixdb.get_node(id).await {
                                context_nodes.push(ContextNode {
                                    id: id.to_string(),
                                    label: graph_node.label.clone(),
                                    properties: graph_node.properties.clone(),
                                    score: 1.0, // グラフクエリの結果は高スコア
                                });
                            }
                        }
                    }
                }
            }
        }

        // 2. ベクトル検索
        let query_vector = self.embedding.embed_text(query).await?;
        let vector_results = self.helixdb.vector_search(&query_vector, 10).await?;

        for result in vector_results {
            if let Ok(Some(node)) = self.helixdb.get_node(&result.node_id).await {
                // 既に追加されているノードはスキップ
                if !context_nodes.iter().any(|n| n.id == result.node_id) {
                    context_nodes.push(ContextNode {
                        id: result.node_id.clone(),
                        label: node.label.clone(),
                        properties: node.properties.clone(),
                        score: result.score,
                    });
                }
            }
        }

        // スコアでソート
        context_nodes.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        // 上位10件を返す
        context_nodes.truncate(10);

        Ok(context_nodes)
    }

    /// レスポンスを生成
    async fn generate_response(&self, query: &str, context: &[ContextNode]) -> Result<String> {
        // コンテキストをテキスト形式に変換
        let context_text = context
            .iter()
            .map(|node| {
                format!(
                    "Node ID: {}\nLabel: {}\nProperties: {}\n",
                    node.id,
                    node.label,
                    serde_json::to_string(&node.properties).unwrap_or_default()
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        let prompt = format!(
            r#"You are a helpful assistant that answers questions based on the provided graph context.

Graph Context:
{}

User Query: {}

Please provide a comprehensive answer based on the graph context. If the context doesn't contain enough information, say so."#,
            context_text, query
        );

        let response = self
            .openai_client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.openai_api_key))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "model": "gpt-4",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that answers questions based on graph context."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("OpenAI API error: {}", error_text);
            return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
        }

        let result: ChatCompletionResponse = response.json().await?;
        
        if let Some(choice) = result.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err(anyhow::anyhow!("No response from OpenAI"))
        }
    }

    /// セマンティック検索
    pub async fn semantic_search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
        // ベクトル検索を実行
        let query_vector = self.embedding.embed_text(query).await?;
        let vector_results = self.helixdb.vector_search(&query_vector, limit).await?;

        let mut results = Vec::new();
        for result in vector_results {
            if let Ok(Some(node)) = self.helixdb.get_node(&result.node_id).await {
                results.push(SearchResult {
                    node_id: result.node_id.clone(),
                    label: node.label.clone(),
                    properties: node.properties.clone(),
                    score: result.score,
                });
            }
        }

        Ok(results)
    }
}

/// コンテキストノード
#[derive(Debug, Clone)]
pub struct ContextNode {
    pub id: String,
    pub label: String,
    pub properties: Value,
    pub score: f32,
}

/// 検索結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub node_id: String,
    pub label: String,
    pub properties: Value,
    pub score: f32,
}

/// チャット完了レスポンス
#[derive(Debug, Serialize, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

/// 選択肢
#[derive(Debug, Serialize, Deserialize)]
struct Choice {
    message: Message,
}

/// メッセージ
#[derive(Debug, Serialize, Deserialize)]
struct Message {
    content: String,
}

