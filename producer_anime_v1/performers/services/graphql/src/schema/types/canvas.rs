use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;
use serde_json::Value;

#[derive(SimpleObject, Clone)]
pub struct Canvas {
    pub id: Uuid,
    pub project_id: Uuid,
    pub config: Value,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct CanvasInput {
    pub nodes: Vec<Value>,
    pub edges: Vec<Value>,
}

#[derive(SimpleObject, Clone)]
pub struct StoryGraph {
    pub nodes: Vec<Value>,
    pub edges: Vec<Value>,
}

