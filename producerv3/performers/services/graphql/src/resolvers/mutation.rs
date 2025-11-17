/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-chapters
 * 
 * GraphQL Mutation resolvers
 */
use async_graphql::{Context, Object, ID};
use crate::schema::epub::{
    Epub, Chapter, Media, MetadataItem,
    CreateEpubInput, UpdateEpubInput,
    CreateChapterInput, UpdateChapterInput,
    CreateMediaInput, UpdateMetadataInput,
};
use crate::schema::ai::{
    GeneratedText, GenerateTextInput, SummarizeInput, ProofreadInput, TranslateInput,
};
use crate::ports::{postgres, ai_service};

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Create new EPUB
    async fn create_epub(&self, ctx: &Context<'_>, input: CreateEpubInput) -> async_graphql::Result<Epub> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::create_epub(pool, input.title, input.language).await
    }
    
    /// Update EPUB
    async fn update_epub(&self, ctx: &Context<'_>, input: UpdateEpubInput) -> async_graphql::Result<Epub> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::update_epub(pool, input.id.to_string(), input.title, input.language).await
    }
    
    /// Delete EPUB
    async fn delete_epub(&self, ctx: &Context<'_>, id: ID) -> async_graphql::Result<bool> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::delete_epub(pool, id.to_string()).await
    }
    
    /// Create chapter
    async fn create_chapter(&self, ctx: &Context<'_>, input: CreateChapterInput) -> async_graphql::Result<Chapter> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::create_chapter(
            pool,
            input.epub_id.to_string(),
            input.title,
            input.order,
            input.content_html.unwrap_or_default(),
        ).await
    }
    
    /// Update chapter
    async fn update_chapter(&self, ctx: &Context<'_>, input: UpdateChapterInput) -> async_graphql::Result<Chapter> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::update_chapter(
            pool,
            input.id.to_string(),
            input.title,
            input.order,
            input.content_html,
        ).await
    }
    
    /// Delete chapter
    async fn delete_chapter(&self, ctx: &Context<'_>, id: ID) -> async_graphql::Result<bool> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::delete_chapter(pool, id.to_string()).await
    }
    
    /// Create media
    async fn create_media(&self, ctx: &Context<'_>, input: CreateMediaInput) -> async_graphql::Result<Media> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::create_media(
            pool,
            input.chapter_id.to_string(),
            input.r#type,
            input.url,
            input.mime_type,
            input.file_size,
        ).await
    }
    
    /// Update metadata
    async fn update_metadata(&self, ctx: &Context<'_>, input: UpdateMetadataInput) -> async_graphql::Result<MetadataItem> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::update_metadata(
            pool,
            input.epub_id.to_string(),
            input.key,
            input.value,
        ).await
    }
    
    /// Generate text using AI
    async fn generate_text(&self, _ctx: &Context<'_>, input: GenerateTextInput) -> async_graphql::Result<GeneratedText> {
        ai_service::generate_text(input).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to generate text: {:?}", e)))
    }
    
    /// Summarize chapter content
    async fn summarize_chapter(&self, ctx: &Context<'_>, input: SummarizeInput) -> async_graphql::Result<GeneratedText> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        ai_service::summarize_chapter(pool, input).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to summarize chapter: {:?}", e)))
    }
    
    /// Proofread chapter content
    async fn proofread_chapter(&self, ctx: &Context<'_>, input: ProofreadInput) -> async_graphql::Result<GeneratedText> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        ai_service::proofread_chapter(pool, input).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to proofread chapter: {:?}", e)))
    }
    
    /// Translate chapter content
    async fn translate_chapter(&self, ctx: &Context<'_>, input: TranslateInput) -> async_graphql::Result<GeneratedText> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        ai_service::translate_chapter(pool, input).await
            .map_err(|e| async_graphql::Error::new(format!("Failed to translate chapter: {:?}", e)))
    }
}

