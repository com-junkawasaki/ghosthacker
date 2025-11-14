/**
 * TerminusDB Schema Management
 * 
 * @context {
 *   "@id": "ex:TerminusDBSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:SchemaManagement"
 * }
 */

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{info, warn};

use super::client::get_client;

/// Storyドキュメント構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Story {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:title")]
    pub title: String,
    #[serde(rename = "ex:content")]
    pub content: String,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// Scriptドキュメント構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:scriptText")]
    pub script_text: String,
    #[serde(rename = "ex:derivedFromStory")]
    pub derived_from_story: String,
    #[serde(rename = "ex:status")]
    pub status: String,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// OWLスキーマをTerminusDBに適用
/// 
/// @context {
///   "@id": "ex:applyOWLSchema",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:AppliedSchema"
/// }
pub async fn apply_owl_schema() -> Result<()> {
    let client = get_client()?;

    info!("Applying OWL schema to database");

    // Storyクラスのスキーマ定義
    let story_schema = json!({
        "@id": "ex:Story",
        "@type": "owl:Class",
        "rdfs:label": "Story",
        "rdfs:comment": "A story document"
    });

    // Scriptクラスのスキーマ定義
    let script_schema = json!({
        "@id": "ex:Script",
        "@type": "owl:Class",
        "rdfs:label": "Script",
        "rdfs:comment": "A script generated from a story"
    });

    // スキーマを適用（既に存在する場合はエラーを無視）
    match client.insert_schema(&story_schema).await {
        Ok(_) => {
            info!("Story schema applied successfully");
        }
        Err(e) => {
            warn!("Failed to apply Story schema (may already exist): {}", e);
        }
    }

    match client.insert_schema(&script_schema).await {
        Ok(_) => {
            info!("Script schema applied successfully");
        }
        Err(e) => {
            warn!("Failed to apply Script schema (may already exist): {}", e);
        }
    }

    info!("OWL schema application completed");
    Ok(())
}
