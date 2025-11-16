/**
 * Database Schema Models
 * SQLx 用のリレーショナルテーブルスキーマモデル
 * 
 * @context {
 *   "@id": "ex:DatabaseSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:SchemaManagement"
 * }
 */

use chrono::{DateTime, Utc};
use sqlx::FromRow;

/// Project構造体
#[derive(Debug, Clone, FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Story構造体
#[derive(Debug, Clone, FromRow)]
pub struct Story {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Script構造体
#[derive(Debug, Clone, FromRow)]
pub struct Script {
    pub id: String,
    pub script_text: String,
    pub derived_from_story: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Metadata構造体
#[derive(Debug, Clone, FromRow)]
pub struct Metadata {
    pub id: String,
    pub title: Option<String>,
    pub isbn: Option<String>,
    pub language: Option<String>,
    pub publisher: Option<String>,
    pub date: Option<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// EPUBDocument構造体
#[derive(Debug, Clone, FromRow)]
pub struct EPUBDocument {
    pub id: String,
    pub title: String,
    pub metadata_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// KindleDocument構造体
#[derive(Debug, Clone, FromRow)]
pub struct KindleDocument {
    pub id: String,
    pub title: String,
    pub metadata_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Chapter構造体
#[derive(Debug, Clone, FromRow)]
pub struct Chapter {
    pub id: String,
    pub epub_document_id: Option<String>,
    pub kindle_document_id: Option<String>,
    pub title: String,
    #[sqlx(rename = "order")]
    pub order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Section構造体
#[derive(Debug, Clone, FromRow)]
pub struct Section {
    pub id: String,
    pub chapter_id: String,
    pub title: String,
    #[sqlx(rename = "order")]
    pub order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Paragraph構造体
#[derive(Debug, Clone, FromRow)]
pub struct Paragraph {
    pub id: String,
    pub chapter_id: Option<String>,
    pub section_id: Option<String>,
    #[sqlx(rename = "order")]
    pub order: i32,
    pub style: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// TextNode構造体
#[derive(Debug, Clone, FromRow)]
pub struct TextNode {
    pub id: String,
    pub paragraph_id: String,
    pub content: String,
    #[sqlx(rename = "order")]
    pub order: i32,
    pub style: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 型エイリアス（後方互換性のため）
pub type DatabaseProject = Project;
pub type DatabaseStory = Story;
pub type DatabaseScript = Script;
pub type DatabaseMetadata = Metadata;
pub type DatabaseEPUBDocument = EPUBDocument;
pub type DatabaseKindleDocument = KindleDocument;
pub type DatabaseChapter = Chapter;
pub type DatabaseSection = Section;
pub type DatabaseParagraph = Paragraph;
pub type DatabaseTextNode = TextNode;
