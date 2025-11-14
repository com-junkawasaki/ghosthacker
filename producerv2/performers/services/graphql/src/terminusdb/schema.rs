/**
 * TerminusDB Schema Management
 * 
 * @context {
 *   "@id": "ex:TerminusDBSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:SchemaManagement"
 * }
 */

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use terminusdb_rs::{BranchSpec, DocumentInsertArgs};
use tracing::{info, warn};

use super::client::{get_client, get_database_name};

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
    let db_name = get_database_name();
    let branch = BranchSpec::from(db_name.clone());
    let args = DocumentInsertArgs::from(branch.clone());

    info!("Applying OWL schema to database '{}'", db_name);

    // Storyスキーマを適用
    match client.schema::<Story>(args.clone()).await {
        Ok(_) => {
            info!("Story schema applied successfully");
        }
        Err(e) => {
            warn!("Failed to apply Story schema (may already exist): {}", e);
        }
    }

    // Scriptスキーマを適用
    match client.schema::<Script>(args.clone()).await {
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

