use async_graphql::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(SimpleObject, Clone)]
pub struct WattpadConfig {
    pub chapter_count: i32,
    pub include_images: bool,
    pub chapter_length_words: Option<Vec<i32>>,
    pub image_frequency: String,
}

#[derive(SimpleObject, Clone)]
pub struct WebtoonConfig {
    pub episode_panels: i32,
    pub bubble_density: String,
    pub reading_pace: String,
    pub sound_effects: bool,
}

#[derive(SimpleObject, Clone)]
pub struct YoutubeConfig {
    pub target_duration_sec: i32,
    pub aspect_ratio: String,
    pub captions: bool,
    pub broll_ratio: f64,
}

#[derive(SimpleObject, Clone)]
pub struct Platform {
    pub id: Uuid,
    pub project_id: Uuid,
    pub wattpad: WattpadConfig,
    pub webtoon: WebtoonConfig,
    pub youtube: YoutubeConfig,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(InputObject)]
pub struct WattpadConfigInput {
    pub chapter_count: i32,
    pub include_images: bool,
    pub chapter_length_words: Option<Vec<i32>>,
    pub image_frequency: String,
}

#[derive(InputObject)]
pub struct WebtoonConfigInput {
    pub episode_panels: i32,
    pub bubble_density: String,
    pub reading_pace: String,
    pub sound_effects: bool,
}

#[derive(InputObject)]
pub struct YoutubeConfigInput {
    pub target_duration_sec: i32,
    pub aspect_ratio: String,
    pub captions: bool,
    pub broll_ratio: f64,
}

#[derive(InputObject)]
pub struct PlatformInput {
    pub wattpad: WattpadConfigInput,
    pub webtoon: WebtoonConfigInput,
    pub youtube: YoutubeConfigInput,
}

