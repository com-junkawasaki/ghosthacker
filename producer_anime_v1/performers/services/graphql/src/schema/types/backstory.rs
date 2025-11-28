use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct Backstory {
    pub id: Uuid,
    pub project_id: Uuid,
    pub character_id: Option<Uuid>,
    pub origin: String,
    pub motivation: Option<String>,
    pub conflict: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct BackstoryInput {
    pub origin: String,
    pub motivation: Option<String>,
    pub conflict: Option<String>,
    pub character_name: Option<String>,
}

