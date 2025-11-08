use async_graphql::*;
use crate::infra::database::DbPool;
use crate::schema::types::*;
use crate::activities::{StoryActivities, CanvasActivities, PipelineActivities};
use uuid::Uuid;

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_project(&self, ctx: &Context<'_>, input: ProjectInput) -> Result<Project> {
        let pool = ctx.data::<DbPool>()?;
        
        StoryActivities::create_project(pool, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn update_project(
        &self,
        ctx: &Context<'_>,
        id: ID,
        input: ProjectInput,
    ) -> Result<Project> {
        // TODO: Implement update_project
        Err(Error::new("Not implemented"))
    }

    async fn save_narrative(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: NarrativeInput,
    ) -> Result<Narrative> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::save_narrative(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn save_characters(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: Vec<CharacterInput>,
    ) -> Result<Vec<Character>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::save_characters(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn save_backstories(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: Vec<BackstoryInput>,
    ) -> Result<Vec<Backstory>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::save_backstories(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn save_episodes(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: Vec<EpisodeInput>,
    ) -> Result<Vec<Episode>> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::save_episodes(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn save_styles(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: StyleInput,
    ) -> Result<Style> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::save_styles(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn save_platforms(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: PlatformInput,
    ) -> Result<Platform> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        StoryActivities::save_platforms(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn save_canvas(
        &self,
        ctx: &Context<'_>,
        project_id: ID,
        input: CanvasInput,
    ) -> Result<Canvas> {
        let pool = ctx.data::<DbPool>()?;
        let uuid = Uuid::parse_str(&project_id.to_string())
            .map_err(|e| Error::new(format!("Invalid UUID: {}", e)))?;
        
        CanvasActivities::save_canvas(pool, uuid, input)
            .await
            .map_err(|e| Error::new(e))
    }

    async fn run_pipeline(
        &self,
        ctx: &Context<'_>,
        input: PipelineInput,
    ) -> Result<PipelineExecution> {
        let pool = ctx.data::<DbPool>()?;
        
        PipelineActivities::run_pipeline(pool, input)
            .await
            .map_err(|e| Error::new(e))
    }
}

