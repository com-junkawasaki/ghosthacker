/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * GraphQL Query resolvers
 */
use async_graphql::{Context, Object, ID};
use crate::schema::epub::{Epub, Chapter, Media, MetadataItem};
use crate::schema::jsonld::{
    Character, Ghost, Location, Organization, Company, Technology,
    Episode, Scene, Motif, Season, Timeline, Event,
    SourceRef, Occupation, Setting,
};
use crate::schema::jsonld::Arc as JsonldArc;
use crate::schema::graph::{GraphLink, GraphIncidence};
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

    // JSON-LD Node queries
    /// Get all characters
    async fn characters(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Character>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_characters(pool).await
    }

    /// Get all ghosts
    async fn ghosts(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Ghost>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_ghosts(pool).await
    }

    /// Get all locations
    async fn locations(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Location>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_locations(pool).await
    }

    /// Get all organizations
    async fn organizations(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Organization>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_organizations(pool).await
    }

    /// Get all companies
    async fn companies(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Company>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_companies(pool).await
    }

    /// Get all technologies
    async fn technologies(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Technology>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_technologies(pool).await
    }

    /// Get all episodes
    async fn episodes(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Episode>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_episodes(pool).await
    }

    /// Get all scenes
    async fn scenes(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Scene>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_scenes(pool).await
    }

    /// Get all arcs
    async fn arcs(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<JsonldArc>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_arcs(pool).await
    }

    /// Get all motifs
    async fn motifs(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Motif>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_motifs(pool).await
    }

    /// Get all seasons
    async fn seasons(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Season>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_seasons(pool).await
    }

    /// Get all timelines
    async fn timelines(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Timeline>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_timelines(pool).await
    }

    /// Get all events
    async fn events(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Event>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_events(pool).await
    }

    /// Get all source references
    async fn source_refs(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<SourceRef>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_source_refs(pool).await
    }

    /// Get all occupations
    async fn occupations(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Occupation>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_occupations(pool).await
    }

    /// Get all settings
    async fn settings(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<Setting>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_settings(pool).await
    }

    // Graph queries
    /// Get all graph links
    async fn graph_links(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<GraphLink>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_graph_links(pool).await
    }

    /// Get graph links for a specific node
    async fn graph_links_for_node(
        &self,
        ctx: &Context<'_>,
        node_type: String,
        node_id: ID,
    ) -> async_graphql::Result<Vec<GraphLink>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_graph_links_for_node(pool, node_type, node_id.to_string()).await
    }

    /// Get all graph incidences
    async fn graph_incidences(&self, ctx: &Context<'_>) -> async_graphql::Result<Vec<GraphIncidence>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::list_graph_incidences(pool).await
    }

    /// Get graph incidences for a specific link
    async fn graph_incidences_for_link(
        &self,
        ctx: &Context<'_>,
        link_id: ID,
    ) -> async_graphql::Result<Vec<GraphIncidence>> {
        let pool = ctx.data::<postgres::PostgresPool>()?;
        postgres::get_graph_incidences_for_link(pool, link_id.to_string()).await
    }
}

