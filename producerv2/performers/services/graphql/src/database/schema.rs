/**
 * Database Schema Models
 * SQLx 用の RDF/SHACL/JSON-LD スキーマモデル
 * 
 * @context {
 *   "@id": "ex:DatabaseSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:SchemaManagement"
 * }
 */

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::client::{get_document, insert_document, update_document};

/// JSON-LD ドキュメントから構造体への変換トレイト
pub trait FromJsonLd: Sized {
    fn from_jsonld(value: &Value) -> Result<Self>;
}

/// 構造体から JSON-LD ドキュメントへの変換トレイト
pub trait ToJsonLd {
    fn to_jsonld(&self) -> Value;
}

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

impl FromJsonLd for Story {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Story {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for Script {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Script {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for EPUBDocument {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for EPUBDocument {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for KindleDocument {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for KindleDocument {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for Chapter {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Chapter {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for Section {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Section {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for Paragraph {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Paragraph {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for TextNode {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for TextNode {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for Metadata {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Metadata {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
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

impl FromJsonLd for Project {
    fn from_jsonld(value: &Value) -> Result<Self> {
        Ok(serde_json::from_value(value.clone())?)
    }
}

impl ToJsonLd for Project {
    fn to_jsonld(&self) -> Value {
        serde_json::to_value(self).unwrap()
    }
}

/// 型安全なドキュメント取得
pub async fn get_document_typed<T: FromJsonLd>(id: &str) -> Result<T> {
    let doc = get_document(id).await?;
    T::from_jsonld(&doc)
}

/// 型安全なドキュメント挿入
pub async fn insert_document_typed<T: ToJsonLd>(instance: &T) -> Result<()> {
    let doc = instance.to_jsonld();
    insert_document(&doc).await
}

/// 型安全なドキュメント更新
pub async fn update_document_typed<T: ToJsonLd>(instance: &T) -> Result<()> {
    let doc = instance.to_jsonld();
    update_document(&doc).await
}

