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
use terminusdb_schema_derive::TerminusDBModel;

use super::client::{get_client, insert_schema_typed};

/// Storyドキュメント構造体
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Story",
    base = "ex:",
    key = "random"
)]
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
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Script",
    base = "ex:",
    key = "random"
)]
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

/// EPUBドキュメント構造体
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "EPUBDocument",
    base = "ex:",
    key = "random"
)]
pub struct EPUBDocument {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:title")]
    pub title: String,
    #[serde(rename = "ex:hasMetadata", skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
    #[serde(rename = "ex:hasChapter", skip_serializing_if = "Option::is_none")]
    pub chapters: Option<Vec<String>>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// Kindleドキュメント構造体
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "KindleDocument",
    base = "ex:",
    key = "random"
)]
pub struct KindleDocument {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:title")]
    pub title: String,
    #[serde(rename = "ex:hasMetadata", skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
    #[serde(rename = "ex:hasChapter", skip_serializing_if = "Option::is_none")]
    pub chapters: Option<Vec<String>>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// 章構造体
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Chapter",
    base = "ex:",
    key = "random"
)]
pub struct Chapter {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:title")]
    pub title: String,
    #[serde(rename = "ex:order")]
    pub order: i32,
    #[serde(rename = "ex:hasSection", skip_serializing_if = "Option::is_none")]
    pub sections: Option<Vec<String>>,
    #[serde(rename = "ex:hasParagraph", skip_serializing_if = "Option::is_none")]
    pub paragraphs: Option<Vec<String>>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// 節構造体
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Section",
    base = "ex:",
    key = "random"
)]
pub struct Section {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:title")]
    pub title: String,
    #[serde(rename = "ex:order")]
    pub order: i32,
    #[serde(rename = "ex:hasParagraph", skip_serializing_if = "Option::is_none")]
    pub paragraphs: Option<Vec<String>>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// 段落構造体
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Paragraph",
    base = "ex:",
    key = "random"
)]
pub struct Paragraph {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:order")]
    pub order: i32,
    #[serde(rename = "ex:hasTextNode", skip_serializing_if = "Option::is_none")]
    pub text_nodes: Option<Vec<String>>,
    #[serde(rename = "ex:hasStyle", skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// テキストノード構造体（RDFリソースとして）
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "TextNode",
    base = "ex:",
    key = "random"
)]
pub struct TextNode {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:content")]
    pub content: String,
    #[serde(rename = "ex:order")]
    pub order: i32,
    #[serde(rename = "ex:belongsToParagraph")]
    pub belongs_to_paragraph: String,
    #[serde(rename = "ex:hasStyle", skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// メタデータ構造体（Dublin Core）
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Metadata",
    base = "ex:",
    key = "random"
)]
pub struct Metadata {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "dct:title", skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(rename = "dct:identifier", skip_serializing_if = "Option::is_none")]
    pub isbn: Option<String>,
    #[serde(rename = "dct:language", skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(rename = "dct:publisher", skip_serializing_if = "Option::is_none")]
    pub publisher: Option<String>,
    #[serde(rename = "dct:date", skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    #[serde(rename = "dct:description", skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// スタイル構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Style {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:fontFamily", skip_serializing_if = "Option::is_none")]
    pub font_family: Option<String>,
    #[serde(rename = "ex:fontSize", skip_serializing_if = "Option::is_none")]
    pub font_size: Option<String>,
    #[serde(rename = "ex:fontWeight", skip_serializing_if = "Option::is_none")]
    pub font_weight: Option<String>,
    #[serde(rename = "ex:color", skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(rename = "ex:alignment", skip_serializing_if = "Option::is_none")]
    pub alignment: Option<String>,
}

/// Project構造体
/// 
/// TerminusDBModel トレイトを使用して型安全なスキーマ定義を提供
/// 既存のコードとの互換性のため、@id と @type フィールドを保持
#[derive(TerminusDBModel, Debug, Clone, Serialize, Deserialize)]
#[tdb(
    class_name = "Project",
    base = "terminusdb:///schema#",
    key = "random"
)]
pub struct Project {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:name")]
    pub name: String,
    #[serde(rename = "author", skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(rename = "ex:description", skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "ex:status", skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(rename = "ex:createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(rename = "ex:updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

/// OWLスキーマをTerminusDBに適用
/// terminusdb-rs を使用した型安全な実装
/// 
/// @context {
///   "@id": "ex:applyOWLSchema",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:AppliedSchema"
/// }
pub async fn apply_owl_schema() -> Result<()> {
    info!("Applying OWL schema to database using terminusdb-rs");

    // Project スキーマを挿入（型安全な方法）
    match insert_schema_typed::<Project>().await {
        Ok(_) => {
            info!("Project schema applied successfully");
        }
        Err(e) => {
            warn!("Failed to apply Project schema (may already exist): {}", e);
        }
    }

    // 注意: 他のスキーマ（Story, Script, EPUBDocument など）は
    // 将来的に TerminusDBModel を実装した型として定義する必要があります
    // 現在は Project のみ型安全なスキーマ適用を実装しています

    info!("OWL schema application completed");
    Ok(())
}
