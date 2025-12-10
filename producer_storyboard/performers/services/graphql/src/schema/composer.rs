/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/graphql-schema-composer
 * 
 * GraphQL schema types for Composer Editor
 */
use async_graphql::{SimpleObject, ID};

#[derive(SimpleObject, Clone)]
pub struct Composer {
    pub id: ID,
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub title: String,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct AudioTrack {
    pub id: ID,
    #[graphql(name = "composerId")]
    pub composer_id: ID,
    #[graphql(name = "trackNumber")]
    pub track_number: i32,
    #[graphql(name = "trackType")]
    pub track_type: String,
    pub name: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct AudioClip {
    pub id: ID,
    #[graphql(name = "trackId")]
    pub track_id: ID,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: f64,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: f64,
    #[graphql(name = "audioType")]
    pub audio_type: String,
    #[graphql(name = "audioUrl")]
    pub audio_url: Option<String>,
    #[graphql(name = "audioDataId")]
    pub audio_data_id: Option<ID>,
    pub metadata: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct SunoMusic {
    pub id: ID,
    #[graphql(name = "composerId")]
    pub composer_id: Option<ID>,
    pub prompt: String,
    pub status: String,
    #[graphql(name = "audioUrl")]
    pub audio_url: Option<String>,
    #[graphql(name = "audioDataId")]
    pub audio_data_id: Option<ID>,
    #[graphql(name = "taskId")]
    pub task_id: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

