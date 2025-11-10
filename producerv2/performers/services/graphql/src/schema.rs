/**
 * GraphQL Schema定義
 * TerminusDB OWLから生成されるGraphQLスキーマ
 */

use async_graphql::{Object, SimpleObject};
use serde::{Deserialize, Serialize};

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Storyを取得
    async fn story(&self, id: String) -> Option<Story> {
        // 実際の実装では、TerminusDBから取得
        None
    }

    /// すべてのStoryを取得
    async fn stories(&self) -> Vec<Story> {
        // 実際の実装では、TerminusDBから取得
        vec![]
    }

    /// Scriptを取得
    async fn script(&self, id: String) -> Option<Script> {
        // 実際の実装では、TerminusDBから取得
        None
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Story {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Script {
    pub id: String,
    pub script_text: String,
    pub derived_from_story: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct ImageAsset {
    pub id: String,
    pub image_url: String,
    pub derived_from_script: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct AudioAsset {
    pub id: String,
    pub audio_url: String,
    pub derived_from_script: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct VideoAsset {
    pub id: String,
    pub video_url: String,
    pub composed_from: Vec<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct YouTubePublication {
    pub id: String,
    pub youtube_video_id: String,
    pub youtube_url: String,
    pub published_from: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

