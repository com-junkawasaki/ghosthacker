/**
 * GraphQL Schema定義
 * TerminusDB OWLから生成されるGraphQLスキーマ
 * 
 * @context {
 *   "@id": "ex:GraphQLSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphQLSchema"
 * }
 */

use async_graphql::{Error, Object, Result, SimpleObject};
use nanoid::nanoid;
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::terminusdb::{
    client::get_client,
    schema::{Script as TerminusScript, Story as TerminusStory},
};

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Storyを取得
    /// 
    /// @context {
    ///   "@id": "ex:getStory",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:StoryId",
    ///   "ex:produces": "ex:Story"
    /// }
    async fn story(&self, id: String) -> Result<Option<Story>> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        match client.get_document(&id).await {
            Ok(doc) => {
                match serde_json::from_value::<TerminusStory>(doc) {
                    Ok(story) => Ok(Some(story.into())),
                    Err(e) => {
                        error!("Failed to parse story {}: {}", id, e);
                        Ok(None)
                    }
                }
            }
            Err(e) => {
                error!("Failed to get story {}: {}", id, e);
                Ok(None)
            }
        }
    }

    /// すべてのStoryを取得
    /// 
    /// @context {
    ///   "@id": "ex:getAllStories",
    ///   "@type": "ex:Activity",
    ///   "ex:produces": "ex:StoryList"
    /// }
    async fn stories(&self) -> Result<Vec<Story>> {
        // 簡易実装: 実際のWOQLクエリが必要
        // 現時点では空のリストを返す
        Ok(vec![])
    }

    /// Scriptを取得
    /// 
    /// @context {
    ///   "@id": "ex:getScript",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ScriptId",
    ///   "ex:produces": "ex:Script"
    /// }
    async fn script(&self, id: String) -> Result<Option<Script>> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        match client.get_document(&id).await {
            Ok(doc) => {
                match serde_json::from_value::<TerminusScript>(doc) {
                    Ok(script) => Ok(Some(script.into())),
                    Err(e) => {
                        error!("Failed to parse script {}: {}", id, e);
                        Ok(None)
                    }
                }
            }
            Err(e) => {
                error!("Failed to get script {}: {}", id, e);
                Ok(None)
            }
        }
    }
}

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Storyを作成
    /// 
    /// @context {
    ///   "@id": "ex:createStory",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:StoryInput",
    ///   "ex:produces": "ex:Story"
    /// }
    async fn create_story(&self, title: String, content: String) -> Result<Story> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        let now = chrono::Utc::now().to_rfc3339();
        let story_id = format!("Story_{}", nanoid!());

        let story = TerminusStory {
            id: story_id.clone(),
            r#type: "ex:Story".to_string(),
            title: title.clone(),
            content: content.clone(),
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };

        let doc = serde_json::to_value(&story)?;
        match client.insert_document(&doc).await {
            Ok(_) => Ok(story.into()),
            Err(e) => {
                error!("Failed to create story: {}", e);
                Err(Error::new(format!("Failed to create story: {}", e)))
            }
        }
    }

    /// Storyを更新
    /// 
    /// @context {
    ///   "@id": "ex:updateStory",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": ["ex:StoryId", "ex:StoryUpdate"],
    ///   "ex:produces": "ex:Story"
    /// }
    async fn update_story(
        &self,
        id: String,
        title: Option<String>,
        content: Option<String>,
    ) -> Result<Story> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        // 既存のStoryを取得
        let doc = client.get_document(&id).await
            .map_err(|e| Error::new(format!("Story not found: {}", e)))?;
        let mut story: TerminusStory = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse story: {}", e)))?;

        // 更新フィールドを適用
        if let Some(t) = title {
            story.title = t;
        }
        if let Some(c) = content {
            story.content = c;
        }
        story.updated_at = Some(chrono::Utc::now().to_rfc3339());

        let doc = serde_json::to_value(&story)?;
        match client.update_document(&doc).await {
            Ok(_) => Ok(story.into()),
            Err(e) => {
                error!("Failed to update story: {}", e);
                Err(Error::new(format!("Failed to update story: {}", e)))
            }
        }
    }

    /// Storyを削除
    /// 
    /// @context {
    ///   "@id": "ex:deleteStory",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:StoryId",
    ///   "ex:produces": "ex:Deleted"
    /// }
    async fn delete_story(&self, id: String) -> Result<bool> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        match client.delete_document(&id).await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Failed to delete story: {}", e);
                Err(Error::new(format!("Failed to delete story: {}", e)))
            }
        }
    }

    /// Scriptを作成
    /// 
    /// @context {
    ///   "@id": "ex:createScript",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ScriptInput",
    ///   "ex:produces": "ex:Script"
    /// }
    async fn create_script(
        &self,
        script_text: String,
        derived_from_story: String,
        status: String,
    ) -> Result<Script> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        let now = chrono::Utc::now().to_rfc3339();
        let script_id = format!("Script_{}", nanoid!());

        let script = TerminusScript {
            id: script_id.clone(),
            r#type: "ex:Script".to_string(),
            script_text: script_text.clone(),
            derived_from_story: derived_from_story.clone(),
            status: status.clone(),
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };

        let doc = serde_json::to_value(&script)?;
        match client.insert_document(&doc).await {
            Ok(_) => Ok(script.into()),
            Err(e) => {
                error!("Failed to create script: {}", e);
                Err(Error::new(format!("Failed to create script: {}", e)))
            }
        }
    }

    /// Scriptを更新
    /// 
    /// @context {
    ///   "@id": "ex:updateScript",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": ["ex:ScriptId", "ex:ScriptUpdate"],
    ///   "ex:produces": "ex:Script"
    /// }
    async fn update_script(
        &self,
        id: String,
        script_text: Option<String>,
        status: Option<String>,
    ) -> Result<Script> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        // 既存のScriptを取得
        let doc = client.get_document(&id).await
            .map_err(|e| Error::new(format!("Script not found: {}", e)))?;
        let mut script: TerminusScript = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse script: {}", e)))?;

        // 更新フィールドを適用
        if let Some(st) = script_text {
            script.script_text = st;
        }
        if let Some(s) = status {
            script.status = s;
        }
        script.updated_at = Some(chrono::Utc::now().to_rfc3339());

        let doc = serde_json::to_value(&script)?;
        match client.update_document(&doc).await {
            Ok(_) => Ok(script.into()),
            Err(e) => {
                error!("Failed to update script: {}", e);
                Err(Error::new(format!("Failed to update script: {}", e)))
            }
        }
    }

    /// Scriptを削除
    /// 
    /// @context {
    ///   "@id": "ex:deleteScript",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ScriptId",
    ///   "ex:produces": "ex:Deleted"
    /// }
    async fn delete_script(&self, id: String) -> Result<bool> {
        let client = get_client().map_err(|e| Error::new(e.to_string()))?;

        match client.delete_document(&id).await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Failed to delete script: {}", e);
                Err(Error::new(format!("Failed to delete script: {}", e)))
            }
        }
    }
}

#[derive(Default)]
pub struct SubscriptionRoot;

// Subscriptionは将来実装予定
// #[Subscription]
// impl SubscriptionRoot {
//     /// Story更新のサブスクリプション
//     async fn story_updated(&self) -> impl Stream<Item = Story> {
//         stream! {
//             loop {
//                 tokio::time::sleep(Duration::from_secs(60)).await;
//                 // 実際の実装では、TerminusDBの変更イベントを監視してStoryをyieldする
//             }
//         }
//     }
// }

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Story {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<TerminusStory> for Story {
    fn from(story: TerminusStory) -> Self {
        Story {
            id: story.id,
            title: story.title,
            content: story.content,
            created_at: story.created_at.unwrap_or_default(),
            updated_at: story.updated_at.unwrap_or_default(),
        }
    }
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

impl From<TerminusScript> for Script {
    fn from(script: TerminusScript) -> Self {
        Script {
            id: script.id,
            script_text: script.script_text,
            derived_from_story: script.derived_from_story,
            status: script.status,
            created_at: script.created_at.unwrap_or_default(),
            updated_at: script.updated_at.unwrap_or_default(),
        }
    }
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

