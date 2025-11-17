/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/epub-document
 * 
 * EPUB Document GraphQL schema definitions
 */
use async_graphql::{InputObject, SimpleObject, ID};

// Define nested types first to avoid forward reference issues
#[derive(SimpleObject, Clone)]
pub struct MetadataItem {
    pub key: String,
    pub value: String,
}

#[derive(SimpleObject, Clone)]
pub struct Paragraph {
    pub id: ID,
    pub order: i32,
    pub content_html: String,
}

#[derive(SimpleObject, Clone)]
pub struct Media {
    pub id: ID,
    pub r#type: String,
    pub url: String,
    pub mime_type: String,
    pub file_size: i64,
}

#[derive(SimpleObject, Clone)]
pub struct Chapter {
    pub id: ID,
    pub title: String,
    pub order: i32,
    pub content_html: String,
    pub paragraphs: Vec<Paragraph>,
    pub media: Vec<Media>,
}

#[derive(SimpleObject, Clone)]
pub struct Epub {
    pub id: ID,
    pub title: String,
    pub language: String,
    pub created_at: String,
    pub updated_at: String,
    pub chapters: Vec<Chapter>,
    pub metadata: Vec<MetadataItem>,
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

