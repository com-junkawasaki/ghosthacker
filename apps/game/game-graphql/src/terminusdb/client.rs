/**
 * TerminusDB Client
 * TerminusDBクライアント実装
 */

use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::{json, Value};
use std::sync::Arc;
use once_cell::sync::OnceCell;
use tracing::error;

pub struct TerminusDBClient {
    http_client: Client,
    base_url: String,
    auth_header: String,
    db_name: String,
}

static CLIENT: OnceCell<Arc<TerminusDBClient>> = OnceCell::new();

impl TerminusDBClient {
    pub fn new(base_url: String, user: String, password: String, db_name: String) -> Result<Self> {
        use base64::Engine;
        let credentials = format!("{}:{}", user, password);
        let auth_header = format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes()));
        Ok(Self {
            http_client: Client::new(),
            base_url,
            auth_header,
            db_name,
        })
    }

    pub async fn ensure_database(&self) -> Result<()> {
        // データベースの存在確認
        let check_url = format!("{}/api/db/{}", self.base_url, self.db_name);
        let response = self
            .http_client
            .get(&check_url)
            .header("Authorization", &self.auth_header)
            .send()
            .await?;

        if response.status().as_u16() == 404 {
            // データベースが存在しない場合は作成
            let create_url = format!("{}/api/db", self.base_url);
            let create_body = json!({
                "label": self.db_name,
                "comment": "Ghost Hacker Game Database"
            });
            
            self.http_client
                .post(&create_url)
                .header("Authorization", &self.auth_header)
                .header("Content-Type", "application/json")
                .json(&create_body)
                .send()
                .await?
                .error_for_status()?;
            
            tracing::info!("Database {} created", self.db_name);
        } else {
            response.error_for_status()?;
        }

        Ok(())
    }

    pub async fn insert_schema(&self, schema: &Value) -> Result<()> {
        let url = format!(
            "{}/api/document/{}/local/branch/main?graph_type=schema",
            self.base_url, self.db_name
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(schema)
            .send()
            .await?;

        response.error_for_status()?;
        Ok(())
    }

    /// ドキュメントを取得
    pub async fn get_document(&self, id: &str) -> Result<Value> {
        let url = format!(
            "{}/api/document/{}/local/branch/main/{}",
            self.base_url, self.db_name, id
        );
        let response = self
            .http_client
            .get(&url)
            .header("Authorization", &self.auth_header)
            .send()
            .await?;

        if response.status().as_u16() == 404 {
            return Err(anyhow::anyhow!("Document not found: {}", id));
        }

        response
            .error_for_status()?
            .json()
            .await
            .context("Failed to parse document response")
    }

    /// ドキュメントを挿入
    pub async fn insert_document(&self, document: &Value) -> Result<()> {
        let mut doc = document.clone();
        Self::add_jsonld_context(&mut doc);

        let url = format!(
            "{}/api/document/{}/local/branch/main",
            self.base_url, self.db_name
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&doc)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("TerminusDB insert error ({}): {}", status, error_text);
            return Err(anyhow::anyhow!("TerminusDB error ({}): {}", status, error_text));
        }

        Ok(())
    }

    /// ドキュメントを更新
    pub async fn update_document(&self, document: &Value) -> Result<()> {
        let mut doc = document.clone();
        Self::add_jsonld_context(&mut doc);

        let url = format!(
            "{}/api/document/{}/local/branch/main",
            self.base_url, self.db_name
        );
        let response = self
            .http_client
            .put(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&doc)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("TerminusDB update error ({}): {}", status, error_text);
            return Err(anyhow::anyhow!("TerminusDB error ({}): {}", status, error_text));
        }

        Ok(())
    }

    /// WOQLクエリを実行
    pub async fn query_documents(&self, query: Value) -> Result<Vec<Value>> {
        let url = format!(
            "{}/api/woql/{}/local/branch/main",
            self.base_url, self.db_name
        );
        let response = self
            .http_client
            .post(&url)
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .json(&query)
            .send()
            .await?;

        let result: Value = response.error_for_status()?.json().await?;
        
        // WOQLクエリの結果からドキュメントを抽出
        // TerminusDBのWOQLクエリ結果は {"bindings": [{"V": {...}, ...}]} の形式
        if let Some(bindings) = result.get("bindings").and_then(|b| b.as_array()) {
            let mut documents = Vec::new();
            for binding in bindings {
                if let Some(doc) = binding.get("V") {
                    documents.push(doc.clone());
                }
            }
            Ok(documents)
        } else {
            // フォールバック: 結果が期待される形式でない場合
            Ok(vec![result])
        }
    }

    /// ゴーストに関連するイベント断片を取得するWOQLクエリ
    pub async fn query_event_fragments_by_ghost(&self, ghost_id: &str) -> Result<Vec<Value>> {
        let query = json!({
            "@type": "And",
            "query": [
                {
                    "@type": "Triple",
                    "subject": {"@type": "Value", "variable": "Event"},
                    "predicate": {"@type": "Value", "node": "gh:belongsToGhost"},
                    "object": {"@type": "Value", "node": format!("ghost:{}", ghost_id)}
                },
                {
                    "@type": "Triple",
                    "subject": {"@type": "Value", "variable": "Event"},
                    "predicate": {"@type": "Value", "node": "rdf:type"},
                    "object": {"@type": "Value", "node": "gh:EventFragment"}
                }
            ]
        });
        
        self.query_documents(query).await
    }

    /// すべてのセッションを取得するWOQLクエリ
    pub async fn query_all_sessions(&self) -> Result<Vec<Value>> {
        let query = json!({
            "@type": "Triple",
            "subject": {"@type": "Value", "variable": "Session"},
            "predicate": {"@type": "Value", "node": "rdf:type"},
            "object": {"@type": "Value", "node": "gh:Session"}
        });
        
        self.query_documents(query).await
    }

    /// プレイヤープロフィールを取得するWOQLクエリ
    pub async fn query_player_profile(&self, user_id: &str) -> Result<Vec<Value>> {
        let query = json!({
            "@type": "And",
            "query": [
                {
                    "@type": "Triple",
                    "subject": {"@type": "Value", "variable": "Profile"},
                    "predicate": {"@type": "Value", "node": "rdf:type"},
                    "object": {"@type": "Value", "node": "gh:PlayerProfile"}
                },
                {
                    "@type": "Triple",
                    "subject": {"@type": "Value", "variable": "Profile"},
                    "predicate": {"@type": "Value", "node": "gh:userId"},
                    "object": {"@type": "Value", "data": {"@type": "xsd:string", "@value": user_id}}
                }
            ]
        });
        
        self.query_documents(query).await
    }

    /// JSON-LDドキュメントに@contextを追加
    fn add_jsonld_context(document: &mut Value) {
        if let Some(obj) = document.as_object_mut() {
            if !obj.contains_key("@context") {
                let context = json!({
                    "@base": "https://ghosthacker.example.com/game/",
                    "@vocab": "https://ghosthacker.example.com/game/vocab#",
                    "gh": "https://ghosthacker.example.com/vocab#",
                    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                    "xsd": "http://www.w3.org/2001/XMLSchema#"
                });
                obj.insert("@context".to_string(), context);
            }
        }
    }
}

pub async fn initialize() -> Result<()> {
    let url = std::env::var("TERMINUSDB_URL")
        .unwrap_or_else(|_| "http://localhost:6363".to_string());
    let user = std::env::var("TERMINUSDB_USER")
        .unwrap_or_else(|_| "admin".to_string());
    let password = std::env::var("TERMINUSDB_SERVER_PASS")
        .unwrap_or_else(|_| "root".to_string());
    let db_name = std::env::var("TERMINUSDB_DB")
        .unwrap_or_else(|_| "ghosthacker_game".to_string());

    tracing::info!("Connecting to TerminusDB at {}", url);

    let client = TerminusDBClient::new(url.clone(), user, password, db_name.clone())?;
    client.ensure_database().await?;

    CLIENT.set(Arc::new(client)).map_err(|_| {
        anyhow::anyhow!("TerminusDB client already initialized")
    })?;

    tracing::info!("TerminusDB client initialized successfully");
    Ok(())
}

pub fn get_client() -> Result<Arc<TerminusDBClient>> {
    CLIENT.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("TerminusDB client not initialized. Call initialize() first.")
    })
}

