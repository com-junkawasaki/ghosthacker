use crate::infra::database::DbPool;
use crate::schema::types::*;
use diesel::prelude::*;
use diesel::pg::PgConnection;
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;

use crate::infra::schema::*;

pub struct StoryActivities;

impl StoryActivities {
    pub async fn create_project(
        pool: &DbPool,
        input: ProjectInput,
    ) -> Result<Project, String> {
        let mut conn = pool.get().map_err(|e| format!("Database connection error: {}", e))?;
        
        let new_project = diesel::insert_into(projects::table)
            .values((
                projects::id.eq(Uuid::new_v4()),
                projects::title.eq(&input.title),
                projects::logline.eq(&input.logline),
                projects::genres.eq(json!(input.genres)),
                projects::tone.eq(&input.tone),
                projects::audience_rating.eq(&input.audience_rating),
                projects::language.eq(&input.language),
                projects::keywords.eq(json!(input.keywords)),
                projects::created_at.eq(Utc::now().naive_utc()),
                projects::updated_at.eq(Utc::now().naive_utc()),
            ))
            .get_result::<(Uuid, String, String, serde_json::Value, String, String, String, serde_json::Value, chrono::NaiveDateTime, chrono::NaiveDateTime)>(&mut conn)
            .map_err(|e| format!("Failed to create project: {}", e))?;

        // Convert to GraphQL type
        Ok(Project {
            id: new_project.0,
            title: new_project.1,
            logline: new_project.2,
            genres: serde_json::from_value(new_project.3.clone()).unwrap_or_default(),
            tone: new_project.4,
            audience_rating: new_project.5,
            language: new_project.6,
            keywords: serde_json::from_value(new_project.7.clone()).unwrap_or_default(),
            created_at: new_project.8,
            updated_at: new_project.9,
        })
    }

    pub async fn get_project(pool: &DbPool, id: Uuid) -> Result<Option<Project>, String> {
        let mut conn = pool.get().map_err(|e| format!("Database connection error: {}", e))?;
        
        let result = projects::table
            .filter(projects::id.eq(id))
            .first::<(Uuid, String, String, serde_json::Value, String, String, String, serde_json::Value, chrono::NaiveDateTime, chrono::NaiveDateTime)>(&mut conn)
            .optional()
            .map_err(|e| format!("Failed to get project: {}", e))?;

        match result {
            Some(project) => Ok(Some(Project {
                id: project.0,
                title: project.1,
                logline: project.2,
                genres: serde_json::from_value(project.3.clone()).unwrap_or_default(),
                tone: project.4,
                audience_rating: project.5,
                language: project.6,
                keywords: serde_json::from_value(project.7.clone()).unwrap_or_default(),
                created_at: project.8,
                updated_at: project.9,
            })),
            None => Ok(None),
        }
    }

    // Additional methods will be implemented similarly
    // For brevity, I'll create stub implementations
    pub async fn save_narrative(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: NarrativeInput,
    ) -> Result<Narrative, String> {
        todo!("Implement save_narrative")
    }

    pub async fn get_narrative(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Option<Narrative>, String> {
        todo!("Implement get_narrative")
    }

    pub async fn save_characters(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: Vec<CharacterInput>,
    ) -> Result<Vec<Character>, String> {
        todo!("Implement save_characters")
    }

    pub async fn get_characters(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Vec<Character>, String> {
        todo!("Implement get_characters")
    }

    pub async fn save_backstories(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: Vec<BackstoryInput>,
    ) -> Result<Vec<Backstory>, String> {
        todo!("Implement save_backstories")
    }

    pub async fn get_backstories(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Vec<Backstory>, String> {
        todo!("Implement get_backstories")
    }

    pub async fn save_episodes(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: Vec<EpisodeInput>,
    ) -> Result<Vec<Episode>, String> {
        todo!("Implement save_episodes")
    }

    pub async fn get_episodes(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Vec<Episode>, String> {
        todo!("Implement get_episodes")
    }

    pub async fn save_styles(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: StyleInput,
    ) -> Result<Style, String> {
        todo!("Implement save_styles")
    }

    pub async fn get_styles(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Option<Style>, String> {
        todo!("Implement get_styles")
    }

    pub async fn save_platforms(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: PlatformInput,
    ) -> Result<Platform, String> {
        todo!("Implement save_platforms")
    }

    pub async fn get_platforms(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Option<Platform>, String> {
        todo!("Implement get_platforms")
    }
}

