/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/epub-document
 * 
 * EPUB Document GraphQL schema definitions
 */
use async_graphql::{Object, InputObject, SimpleObject, ID, Scalar, ScalarType};
use chrono::{DateTime, Utc};
use async_graphql::Value;

#[derive(SimpleObject)]
pub struct Epub {
    pub id: ID,
    pub title: String,
    pub language: String,
    #[graphql(scalar)]
    pub created_at: String,
    #[graphql(scalar)]
    pub updated_at: String,
    pub chapters: Vec<Chapter>,
    pub metadata: Vec<MetadataItem>,
}

#[derive(SimpleObject)]
pub struct Chapter {
    pub id: ID,
    pub title: String,
    pub order: i32,
    pub content_html: String,
    pub paragraphs: Vec<Paragraph>,
    pub media: Vec<Media>,
}

#[derive(SimpleObject)]
pub struct Paragraph {
    pub id: ID,
    pub order: i32,
    pub content_html: String,
}

#[derive(SimpleObject)]
pub struct Media {
    pub id: ID,
    pub r#type: String,
    pub url: String,
    pub mime_type: String,
    pub file_size: i64,
}

#[derive(SimpleObject)]
pub struct MetadataItem {
    pub key: String,
    pub value: String,
}

#[derive(InputObject)]
pub struct CreateEpubInput {
    pub title: String,
    pub language: String,
}

#[derive(InputObject)]
pub struct UpdateEpubInput {
    pub id: ID,
    pub title: Option<String>,
    pub language: Option<String>,
}

#[derive(InputObject)]
pub struct CreateChapterInput {
    pub epub_id: ID,
    pub title: String,
    pub order: i32,
    pub content_html: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateChapterInput {
    pub id: ID,
    pub title: Option<String>,
    pub order: Option<i32>,
    pub content_html: Option<String>,
}

#[derive(InputObject)]
pub struct CreateMediaInput {
    pub chapter_id: ID,
    pub r#type: String,
    pub url: String,
    pub mime_type: String,
    pub file_size: i64,
}

#[derive(InputObject)]
pub struct UpdateMetadataInput {
    pub epub_id: ID,
    pub key: String,
    pub value: String,
}

