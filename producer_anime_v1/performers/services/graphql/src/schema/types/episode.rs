use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct MediaObject {
    #[graphql(name = "type")]
    pub type_: String,
    pub content_url: String,
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(SimpleObject, Clone)]
pub struct Episode {
    pub id: Uuid,
    pub project_id: Uuid,
    pub episode_id: String,
    pub name: String,
    pub episode_number: String,
    pub source_path: Option<String>,
    pub has_part: Option<Vec<MediaObject>>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct MediaObjectInput {
    #[graphql(name = "type")]
    pub type_: String,
    pub content_url: String,
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(InputObject)]
pub struct EpisodeInput {
    pub id: String,
    pub name: String,
    pub episode_number: String,
    pub has_part: Option<Vec<MediaObjectInput>>,
}

