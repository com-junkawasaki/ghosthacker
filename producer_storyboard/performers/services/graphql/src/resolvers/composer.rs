/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/composer-queries-mutations
 * 
 * GraphQL Query and Mutation resolvers for Composer
 */
use async_graphql::{Context, ID, Result, InputObject};
use crate::ports::postgres::PostgresPool;
use crate::schema::composer::{Composer, AudioTrack, AudioClip, SunoMusic};
use crate::ports::suno_service::SunoService;
use crate::ports::clerk::get_clerk_auth_from_context;
use uuid::Uuid;
use chrono::Utc;

#[derive(InputObject)]
pub struct CreateComposerInput {
    #[graphql(name = "projectId")]
    pub project_id: ID,
    pub title: Option<String>,
}

#[derive(InputObject)]
pub struct CreateAudioTrackInput {
    #[graphql(name = "composerId")]
    pub composer_id: ID,
    #[graphql(name = "trackNumber")]
    pub track_number: i32,
    #[graphql(name = "trackType")]
    pub track_type: String,
    pub name: Option<String>,
}

#[derive(InputObject)]
pub struct CreateAudioClipInput {
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
}

#[derive(InputObject)]
pub struct GenerateSunoMusicInput {
    #[graphql(name = "composerId")]
    pub composer_id: Option<ID>,
    pub prompt: String,
    #[graphql(name = "customMode")]
    pub custom_mode: Option<bool>,
    #[graphql(name = "makeInstrumental")]
    pub make_instrumental: Option<bool>,
    pub mv: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateAudioClipInput {
    pub id: ID,
    #[graphql(name = "startTimeSeconds")]
    pub start_time_seconds: Option<f64>,
    #[graphql(name = "durationSeconds")]
    pub duration_seconds: Option<f64>,
    #[graphql(name = "trackId")]
    pub track_id: Option<ID>,
}

// Query resolvers
pub async fn composers(ctx: &Context<'_>, project_id: ID) -> Result<Vec<Composer>> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let project_uuid = Uuid::parse_str(&project_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
    
    // Check organization access
    if let Ok(auth) = get_clerk_auth_from_context(ctx) {
        if let Some(org) = auth.org {
            let project_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
                "SELECT org_id FROM storyboard_projects WHERE id = $1"
            )
            .bind(project_uuid)
            .fetch_optional(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to verify project access: {}", e)))?;
            
            match project_org {
                None => return Err(async_graphql::Error::new("Project not found")),
                Some(Some(project_org_id)) => {
                    if project_org_id != org.id {
                        return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                    }
                }
                Some(None) => {
                    return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                }
            }
        }
    }
    
    let rows = sqlx::query_as::<_, (Uuid, Uuid, String, Option<f64>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, project_id, title, duration_seconds, created_at, updated_at
        FROM composers
        WHERE project_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(project_uuid)
    .fetch_all(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to fetch composers: {}", e)))?;
    
    Ok(rows.into_iter().map(|row| Composer {
        id: ID(row.0.to_string()),
        project_id: ID(row.1.to_string()),
        title: row.2,
        duration_seconds: row.3,
        created_at: row.4.to_rfc3339(),
        updated_at: row.5.to_rfc3339(),
    }).collect())
}

pub async fn composer(ctx: &Context<'_>, id: ID) -> Result<Option<Composer>> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let composer_uuid = Uuid::parse_str(&id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid composer ID: {}", e)))?;
    
    let row = sqlx::query_as::<_, (Uuid, Uuid, String, Option<f64>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, project_id, title, duration_seconds, created_at, updated_at
        FROM composers
        WHERE id = $1
        "#,
    )
    .bind(composer_uuid)
    .fetch_optional(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to fetch composer: {}", e)))?;
    
    Ok(row.map(|row| Composer {
        id: ID(row.0.to_string()),
        project_id: ID(row.1.to_string()),
        title: row.2,
        duration_seconds: row.3,
        created_at: row.4.to_rfc3339(),
        updated_at: row.5.to_rfc3339(),
    }))
}

pub async fn audio_tracks(ctx: &Context<'_>, composer_id: ID) -> Result<Vec<AudioTrack>> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let composer_uuid = Uuid::parse_str(&composer_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid composer ID: {}", e)))?;
    
    let rows = sqlx::query_as::<_, (Uuid, Uuid, i32, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, composer_id, track_number, track_type, name, created_at, updated_at
        FROM audio_tracks
        WHERE composer_id = $1
        ORDER BY track_number ASC
        "#,
    )
    .bind(composer_uuid)
    .fetch_all(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to fetch audio tracks: {}", e)))?;
    
    Ok(rows.into_iter().map(|row| AudioTrack {
        id: ID(row.0.to_string()),
        composer_id: ID(row.1.to_string()),
        track_number: row.2,
        track_type: row.3,
        name: row.4,
        created_at: row.5.to_rfc3339(),
        updated_at: row.6.to_rfc3339(),
    }).collect())
}

pub async fn audio_clips(ctx: &Context<'_>, track_id: ID) -> Result<Vec<AudioClip>> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let track_uuid = Uuid::parse_str(&track_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid track ID: {}", e)))?;
    
    let rows = sqlx::query_as::<_, (Uuid, Uuid, f64, f64, String, Option<String>, Option<Uuid>, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at
        FROM audio_clips
        WHERE track_id = $1
        ORDER BY start_time_seconds ASC
        "#,
    )
    .bind(track_uuid)
    .fetch_all(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to fetch audio clips: {}", e)))?;
    
    Ok(rows.into_iter().map(|row| AudioClip {
        id: ID(row.0.to_string()),
        track_id: ID(row.1.to_string()),
        start_time_seconds: row.2,
        duration_seconds: row.3,
        audio_type: row.4,
        audio_url: row.5,
        audio_data_id: row.6.map(|id| ID(id.to_string())),
        metadata: row.7,
        created_at: row.8.to_rfc3339(),
        updated_at: row.9.to_rfc3339(),
    }).collect())
}

pub async fn suno_music(ctx: &Context<'_>, composer_id: ID) -> Result<Vec<SunoMusic>> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let composer_uuid = Uuid::parse_str(&composer_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid composer ID: {}", e)))?;
    
    let rows = sqlx::query_as::<_, (Uuid, Option<Uuid>, String, String, Option<String>, Option<Uuid>, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, composer_id, prompt, status, audio_url, audio_data_id, task_id, created_at, updated_at
        FROM suno_music
        WHERE composer_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(composer_uuid)
    .fetch_all(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to fetch suno music: {}", e)))?;
    
    Ok(rows.into_iter().map(|row| SunoMusic {
        id: ID(row.0.to_string()),
        composer_id: row.1.map(|id| ID(id.to_string())),
        prompt: row.2,
        status: row.3,
        audio_url: row.4,
        audio_data_id: row.5.map(|id| ID(id.to_string())),
        task_id: row.6,
        created_at: row.7.to_rfc3339(),
        updated_at: row.8.to_rfc3339(),
    }).collect())
}

// Mutation resolvers
pub async fn create_composer(ctx: &Context<'_>, input: CreateComposerInput) -> Result<Composer> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let project_uuid = Uuid::parse_str(&input.project_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid project ID: {}", e)))?;
    
    // Check organization access
    if let Ok(auth) = get_clerk_auth_from_context(ctx) {
        if let Some(org) = auth.org {
            let project_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
                "SELECT org_id FROM storyboard_projects WHERE id = $1"
            )
            .bind(project_uuid)
            .fetch_optional(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to verify project access: {}", e)))?;
            
            match project_org {
                None => return Err(async_graphql::Error::new("Project not found")),
                Some(Some(project_org_id)) => {
                    if project_org_id != org.id {
                        return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                    }
                }
                Some(None) => {
                    return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
                }
            }
        }
    }
    
    let id = Uuid::new_v4();
    let now = Utc::now();
    let title = input.title.unwrap_or_else(|| "New Composer".to_string());
    
    sqlx::query(
        r#"
        INSERT INTO composers (id, project_id, title, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4)
        "#,
    )
    .bind(id)
    .bind(project_uuid)
    .bind(&title)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to create composer: {}", e)))?;
    
    Ok(Composer {
        id: ID(id.to_string()),
        project_id: input.project_id,
        title,
        duration_seconds: None,
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
    })
}

pub async fn create_audio_track(ctx: &Context<'_>, input: CreateAudioTrackInput) -> Result<AudioTrack> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let composer_uuid = Uuid::parse_str(&input.composer_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid composer ID: {}", e)))?;
    
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    sqlx::query(
        r#"
        INSERT INTO audio_tracks (id, composer_id, track_number, track_type, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        "#,
    )
    .bind(id)
    .bind(composer_uuid)
    .bind(input.track_number)
    .bind(&input.track_type)
    .bind(&input.name)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to create audio track: {}", e)))?;
    
    Ok(AudioTrack {
        id: ID(id.to_string()),
        composer_id: input.composer_id,
        track_number: input.track_number,
        track_type: input.track_type,
        name: input.name,
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
    })
}

pub async fn create_audio_clip(ctx: &Context<'_>, input: CreateAudioClipInput) -> Result<AudioClip> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let track_uuid = Uuid::parse_str(&input.track_id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid track ID: {}", e)))?;
    
    let audio_data_uuid = input.audio_data_id.as_ref()
        .and_then(|id| Uuid::parse_str(&id.0).ok());
    
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    sqlx::query(
        r#"
        INSERT INTO audio_clips (id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        "#,
    )
    .bind(id)
    .bind(track_uuid)
    .bind(input.start_time_seconds)
    .bind(input.duration_seconds)
    .bind(&input.audio_type)
    .bind(&input.audio_url)
    .bind(audio_data_uuid)
    .bind(&input.metadata)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to create audio clip: {}", e)))?;
    
    Ok(AudioClip {
        id: ID(id.to_string()),
        track_id: input.track_id,
        start_time_seconds: input.start_time_seconds,
        duration_seconds: input.duration_seconds,
        audio_type: input.audio_type,
        audio_url: input.audio_url,
        audio_data_id: input.audio_data_id,
        metadata: input.metadata,
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
    })
}

pub async fn update_audio_clip(ctx: &Context<'_>, input: UpdateAudioClipInput) -> Result<AudioClip> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let clip_uuid = Uuid::parse_str(&input.id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid clip ID: {}", e)))?;
    
    // Build update query dynamically based on provided fields
    let mut updates = Vec::new();
    let mut bind_index = 1;
    
    if let Some(_start_time) = input.start_time_seconds {
        updates.push(format!("start_time_seconds = ${}", bind_index));
        bind_index += 1;
    }
    if let Some(_duration) = input.duration_seconds {
        updates.push(format!("duration_seconds = ${}", bind_index));
        bind_index += 1;
    }
    if let Some(track_id) = &input.track_id {
        updates.push(format!("track_id = ${}", bind_index));
        bind_index += 1;
    }
    
    if updates.is_empty() {
        return Err(async_graphql::Error::new("No fields to update"));
    }
    
    updates.push(format!("updated_at = ${}", bind_index));
    
    let query = format!(
        "UPDATE audio_clips SET {} WHERE id = ${}",
        updates.join(", "),
        bind_index + 1
    );
    
    let mut query_builder = sqlx::query(&query);
    
    bind_index = 1;
    if let Some(start_time) = input.start_time_seconds {
        query_builder = query_builder.bind(start_time);
        bind_index += 1;
    }
    if let Some(duration_secs) = input.duration_seconds {
        query_builder = query_builder.bind(duration_secs);
        bind_index += 1;
    }
    if let Some(track_id) = &input.track_id {
        let track_uuid = Uuid::parse_str(&track_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid track ID: {}", e)))?;
        query_builder = query_builder.bind(track_uuid);
        bind_index += 1;
    }
    query_builder = query_builder.bind(Utc::now());
    query_builder = query_builder.bind(clip_uuid);
    
    query_builder
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to update audio clip: {}", e)))?;
    
    // Fetch updated clip
    let row = sqlx::query_as::<_, (Uuid, Uuid, f64, f64, String, Option<String>, Option<Uuid>, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at
        FROM audio_clips
        WHERE id = $1
        "#,
    )
    .bind(clip_uuid)
    .fetch_one(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to fetch updated clip: {}", e)))?;
    
    Ok(AudioClip {
        id: ID(row.0.to_string()),
        track_id: ID(row.1.to_string()),
        start_time_seconds: row.2,
        duration_seconds: row.3,
        audio_type: row.4,
        audio_url: row.5,
        audio_data_id: row.6.map(|id| ID(id.to_string())),
        metadata: row.7,
        created_at: row.8.to_rfc3339(),
        updated_at: row.9.to_rfc3339(),
    })
}

pub async fn delete_audio_clip(ctx: &Context<'_>, id: ID) -> Result<bool> {
    let pool = ctx.data::<PostgresPool>()?;
    
    let clip_uuid = Uuid::parse_str(&id.0)
        .map_err(|e| async_graphql::Error::new(format!("Invalid clip ID: {}", e)))?;
    
    let result = sqlx::query(
        r#"
        DELETE FROM audio_clips
        WHERE id = $1
        "#,
    )
    .bind(clip_uuid)
    .execute(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to delete audio clip: {}", e)))?;
    
    Ok(result.rows_affected() > 0)
}

pub async fn generate_suno_music(ctx: &Context<'_>, input: GenerateSunoMusicInput) -> Result<SunoMusic> {
    let pool = ctx.data::<PostgresPool>()?;
    
    // Get Suno API key
    let suno_api_key = std::env::var("SUNO_API_KEY")
        .map_err(|_| async_graphql::Error::new("SUNO_API_KEY not configured"))?;
    let suno_service = SunoService::new(suno_api_key);
    
    // Generate music via Suno API
    let task = suno_service.generate_music(
        &input.prompt,
        input.custom_mode,
        input.make_instrumental,
        input.mv.as_deref(),
    ).await
    .map_err(|e| async_graphql::Error::new(format!("Failed to generate music: {}", e)))?;
    
    // Save task to database
    let id = Uuid::new_v4();
    let now = Utc::now();
    let composer_uuid = input.composer_id.as_ref()
        .and_then(|id| Uuid::parse_str(&id.0).ok());
    
    sqlx::query(
        r#"
        INSERT INTO suno_music (id, composer_id, prompt, status, task_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        "#,
    )
    .bind(id)
    .bind(composer_uuid)
    .bind(&input.prompt)
    .bind(&task.status)
    .bind(&task.task_id)
    .bind(now)
    .execute(pool.as_ref())
    .await
    .map_err(|e| async_graphql::Error::new(format!("Failed to save suno music task: {}", e)))?;
    
    Ok(SunoMusic {
        id: ID(id.to_string()),
        composer_id: input.composer_id,
        prompt: input.prompt,
        status: task.status,
        audio_url: task.audio_url,
        audio_data_id: None,
        task_id: Some(task.task_id),
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
    })
}

pub async fn reorder_audio_clips(ctx: &Context<'_>, track_id: ID, clip_ids: Vec<ID>) -> Result<Vec<AudioClip>> {
    let pool = ctx.data::<PostgresPool>()?;
    
    // Update start_time_seconds based on clip order and durations
    // This is a simplified implementation - in production, you'd want more sophisticated logic
    let mut current_time = 0.0;
    
    for (_index, clip_id) in clip_ids.iter().enumerate() {
        let clip_uuid = Uuid::parse_str(&clip_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid clip ID: {}", e)))?;
        
        // Get current duration
        let duration: Option<f64> = sqlx::query_scalar(
            "SELECT duration_seconds FROM audio_clips WHERE id = $1"
        )
        .bind(clip_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to fetch clip duration: {}", e)))?;
        
        if let Some(dur) = duration {
            sqlx::query(
                "UPDATE audio_clips SET start_time_seconds = $1, updated_at = $2 WHERE id = $3"
            )
            .bind(current_time)
            .bind(Utc::now())
            .bind(clip_uuid)
            .execute(pool.as_ref())
            .await
            .map_err(|e| async_graphql::Error::new(format!("Failed to reorder clips: {}", e)))?;
            
            current_time += dur;
        }
    }
    
    // Fetch all clips for the track
    audio_clips(ctx, track_id).await
}
