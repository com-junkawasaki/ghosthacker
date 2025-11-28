use async_graphql::*;
use crate::infra::database::DbPool;
use crate::schema::types::*;
use crate::activities::{StoryActivities, CanvasActivities, PipelineActivities};
use uuid::Uuid;

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn project(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Project>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_project(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn projects(&self, _ctx: &Context<'_>) -> Result<Vec<Project>> {
        // TODO: Implement get all projects
        Ok(vec![])
    }

    async fn narrative(&self, ctx: &Context<'_>, project_id: ID) -> Result<Option<Narrative>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_narrative(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn characters(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Character>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_characters(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn backstories(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Backstory>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_backstories(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn episodes(&self, ctx: &Context<'_>, project_id: ID) -> Result<Vec<Episode>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_episodes(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn styles(&self, ctx: &Context<'_>, project_id: ID) -> Result<Option<Style>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_styles(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn platforms(&self, ctx: &Context<'_>, project_id: ID) -> Result<Option<Platform>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::get_platforms(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn canvas(&self, ctx: &Context<'_>, project_id: ID) -> Result<Option<Canvas>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        CanvasActivities::get_canvas(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn story_graph(&self, ctx: &Context<'_>, project_id: ID) -> Result<StoryGraph> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        CanvasActivities::get_story_graph(pool, uuid)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn pipeline_topology(&self, ctx: &Context<'_>) -> Result<PipelineTopology> {
        let pool = ctx.data::<DbPool>()?;
        
        PipelineActivities::get_pipeline_topology(pool)
            .await
            .map_err(|e| Error::new(e))
    }
}

