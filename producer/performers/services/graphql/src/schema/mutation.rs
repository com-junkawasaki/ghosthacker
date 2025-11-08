use async_graphql::*;
use crate::infra::database::DbPool;
use crate::schema::types::*;
use crate::activities::{StoryActivities, CanvasActivities, PipelineActivities, episode::EpisodeActivities};
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

    /// Generate character dialogue based on character context
    async fn generate_character_dialogue(
        &self,
        character_id: String,
        scene_setting: Option<String>,
    ) -> Result<String> {
        EpisodeActivities::generate_character_dialogue(&character_id, scene_setting.as_deref())
            .await
            .map(|dialogue| serde_json::to_string(&dialogue).unwrap_or_default())
            .map_err(|e| Error::new(e))
    }

    /// Compose episode from dialogue and context
    async fn compose_episode_from_dialogue(
        &self,
        dialogue_json: String,
        episode_structure: Option<String>,
    ) -> Result<String> {
        let dialogue: crate::activities::episode::Dialogue = serde_json::from_str(&dialogue_json)
            .map_err(|e| Error::new(format!("Invalid dialogue JSON: {}", e)))?;

        EpisodeActivities::compose_episode_from_dialogue(dialogue, episode_structure.as_deref())
            .await
            .map(|episode| serde_json::to_string(&episode).unwrap_or_default())
            .map_err(|e| Error::new(e))
    }

    /// Translate episode sentence
    async fn translate_episode_sentence(
        &self,
        episode_id: String,
        sentence_id: String,
        target_language: String,
    ) -> Result<String> {
        EpisodeActivities::translate_episode_sentence(&episode_id, &sentence_id, &target_language)
            .await
            .map_err(|e| Error::new(e))
    }
}

