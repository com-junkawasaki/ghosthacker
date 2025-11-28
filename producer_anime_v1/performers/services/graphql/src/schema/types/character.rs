use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct Character {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub role: String,
    pub motivation: Option<String>,
    pub conflict: Option<String>,
    pub voice: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct CharacterInput {
    pub name: String,
    pub role: String,
    pub motivation: Option<String>,
    pub conflict: Option<String>,
    pub voice: Option<String>,
}

