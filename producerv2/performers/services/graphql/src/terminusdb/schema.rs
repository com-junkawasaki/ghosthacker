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

/// EPUBドキュメント構造体
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "dct:title", skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(rename = "dct:creator", skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    #[serde(rename = "@id")]
    pub id: String,
    #[serde(rename = "@type")]
    pub r#type: String,
    #[serde(rename = "ex:name")]
    pub name: String,
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

    // EPUB/Kindleクラスのスキーマ定義
    let epub_document_schema = json!({
        "@id": "ex:EPUBDocument",
        "@type": "owl:Class",
        "rdfs:label": "EPUB Document",
        "rdfs:comment": "An EPUB document with chapters, sections, paragraphs, and text nodes"
    });

    let kindle_document_schema = json!({
        "@id": "ex:KindleDocument",
        "@type": "owl:Class",
        "rdfs:label": "Kindle Document",
        "rdfs:comment": "A Kindle document with chapters, sections, paragraphs, and text nodes"
    });

    let chapter_schema = json!({
        "@id": "ex:Chapter",
        "@type": "owl:Class",
        "rdfs:label": "Chapter",
        "rdfs:comment": "A chapter in an EPUB or Kindle document"
    });

    let section_schema = json!({
        "@id": "ex:Section",
        "@type": "owl:Class",
        "rdfs:label": "Section",
        "rdfs:comment": "A section within a chapter"
    });

    let paragraph_schema = json!({
        "@id": "ex:Paragraph",
        "@type": "owl:Class",
        "rdfs:label": "Paragraph",
        "rdfs:comment": "A paragraph containing text nodes"
    });

    let text_node_schema = json!({
        "@id": "ex:TextNode",
        "@type": "owl:Class",
        "rdfs:label": "Text Node",
        "rdfs:comment": "A text node as an RDF resource, containing actual text content"
    });

    let metadata_schema = json!({
        "@id": "ex:Metadata",
        "@type": "owl:Class",
        "rdfs:label": "Metadata",
        "rdfs:comment": "Dublin Core metadata for EPUB/Kindle documents"
    });

    let style_schema = json!({
        "@id": "ex:Style",
        "@type": "owl:Class",
        "rdfs:label": "Style",
        "rdfs:comment": "Style information for text nodes and paragraphs"
    });

    let project_schema = json!({
        "@id": "ex:Project",
        "@type": "owl:Class",
        "rdfs:label": "Project",
        "rdfs:comment": "A project for managing content creation workflows"
    });

    // スキーマを適用（既に存在する場合はエラーを無視）
    let schemas = vec![
        ("Story", &story_schema),
        ("Script", &script_schema),
        ("EPUBDocument", &epub_document_schema),
        ("KindleDocument", &kindle_document_schema),
        ("Chapter", &chapter_schema),
        ("Section", &section_schema),
        ("Paragraph", &paragraph_schema),
        ("TextNode", &text_node_schema),
        ("Metadata", &metadata_schema),
        ("Style", &style_schema),
        ("Project", &project_schema),
    ];

    for (name, schema) in schemas {
        match client.insert_schema(schema).await {
            Ok(_) => {
                info!("{} schema applied successfully", name);
            }
            Err(e) => {
                warn!("Failed to apply {} schema (may already exist): {}", name, e);
            }
        }
    }

    info!("OWL schema application completed");
    Ok(())
}
