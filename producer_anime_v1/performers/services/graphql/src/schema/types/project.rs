use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct Project {
    pub id: Uuid,
    pub title: String,
    pub logline: String,
    pub genres: Vec<String>,
    pub tone: String,
    pub audience_rating: String,
    pub language: String,
    pub keywords: Vec<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct ProjectInput {
    pub title: String,
    pub logline: String,
    pub genres: Vec<String>,
    pub tone: String,
    pub audience_rating: String,
    pub language: String,
    pub keywords: Vec<String>,
}

