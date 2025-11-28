use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct Beat {
    pub id: String,
    pub label: String,
    pub purpose: String,
    pub target_length: i32,
}

#[derive(SimpleObject, Clone)]
pub struct Narrative {
    pub id: Uuid,
    pub project_id: Uuid,
    pub synopsis: String,
    pub structure: String,
    pub beats: Vec<Beat>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct BeatInput {
    pub id: String,
    pub label: String,
    pub purpose: String,
    pub target_length: i32,
}

#[derive(InputObject)]
pub struct NarrativeInput {
    pub synopsis: String,
    pub structure: String,
    pub beats: Vec<BeatInput>,
}

