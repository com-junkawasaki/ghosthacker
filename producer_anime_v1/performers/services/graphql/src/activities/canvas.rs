use crate::infra::database::DbPool;
use crate::schema::types::*;
use uuid::Uuid;
use serde_json::Value;

pub struct CanvasActivities;

impl CanvasActivities {
    pub async fn get_canvas(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Option<Canvas>, String> {
        todo!("Implement get_canvas")
    }

    pub async fn save_canvas(
        _pool: &DbPool,
        _project_id: Uuid,
        _input: CanvasInput,
    ) -> Result<Canvas, String> {
        todo!("Implement save_canvas")
    }

    pub async fn get_story_graph(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<StoryGraph, String> {
        // For now, return empty graph
        Ok(StoryGraph {
            nodes: vec![],
            edges: vec![],
        })
    }

    pub async fn seed_canvas(
        _pool: &DbPool,
        _project_id: Uuid,
    ) -> Result<Canvas, String> {
        todo!("Implement seed_canvas")
    }
}

