use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct VisualStyle {
    pub art_style: String,
    pub palette: String,
    pub nsfw_allowed: bool,
}

#[derive(SimpleObject, Clone)]
pub struct AudioStyle {
    pub voice: String,
    pub tempo: String,
    pub music_mood: String,
}

#[derive(SimpleObject, Clone)]
pub struct Style {
    pub id: Uuid,
    pub project_id: Uuid,
    pub visual: VisualStyle,
    pub audio: AudioStyle,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct VisualStyleInput {
    pub art_style: String,
    pub palette: String,
    pub nsfw_allowed: bool,
}

#[derive(InputObject)]
pub struct AudioStyleInput {
    pub voice: String,
    pub tempo: String,
    pub music_mood: String,
}

#[derive(InputObject)]
pub struct StyleInput {
    pub visual: VisualStyleInput,
    pub audio: AudioStyleInput,
}

