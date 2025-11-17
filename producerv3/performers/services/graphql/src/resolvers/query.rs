/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * GraphQL Query resolvers
 */
use async_graphql::{Context, Object, ID};
use crate::schema::epub::{Epub, Chapter, Media, MetadataItem};
use crate::ports::postgres;

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Get EPUB by ID
    async fn epub(&self, ctx: &Context<'_>, id: ID) -> async_graphql::Result<Option<Epub>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_epub(pool, id.to_string()).await
    }
    
    /// List all EPUBs
    async fn epub_list(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Epub>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_epubs(pool).await
    }
    
    /// Get chapter by ID
    async fn chapter(&self, ctx: &Context<'_>, id: ID) -> async_graphql::Result<Option<Chapter>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_chapter(pool, id.to_string()).await
    }
    
    /// Get chapters for EPUB
    async fn chapters(&self, ctx: &Context<'_>, epub_id: ID) -> async_graphql::Result<Vec<Chapter>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_chapters(pool, epub_id.to_string()).await
    }
    
    /// Get media by ID
    async fn media(&self, ctx: &Context<'_>, id: ID) -> async_graphql::Result<Option<Media>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_media(pool, id.to_string()).await
    }
    
    /// Get metadata for EPUB
    async fn metadata(&self, ctx: &Context<'_>, epub_id: ID) -> async_graphql::Result<Vec<MetadataItem>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_metadata(pool, epub_id.to_string()).await
    }
}

