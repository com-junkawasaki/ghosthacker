/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:System
 * @id https://gftd.ai/performer/system/postgresql
 * 
 * PostgreSQL database connection and query implementation using sqlx
 */
use async_graphql::Result;
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::schema::epub::{Epub, Chapter, Media, MetadataItem};
use crate::schema::jsonld::{
    Character, Ghost, Location, Organization, Company, Technology,
    Episode, Scene, Motif, Season, Timeline, Event,
    SourceRef, Occupation, Setting,
};
use crate::schema::graph::{GraphLink, GraphIncidence, CreateGraphLinkInput, UpdateGraphLinkInput, CreateGraphIncidenceInput, UpdateGraphIncidenceInput};
use serde_json::Value;

pub type PostgresPool = Arc<PgPool>;

/// Create PostgreSQL connection pool
pub async fn create_pool() -> anyhow::Result<PostgresPool> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string());
    
    let pool = PgPool::connect(&database_url).await?;
    
    // Run migrations using sqlx::migrate!
    sqlx::migrate!("./migrations").run(&pool).await?;
    
    Ok(Arc::new(pool))
}

/// Get EPUB by ID
pub async fn get_epub(pool: &PostgresPool, id: String) -> Result<Option<Epub>> {
    let epub_row = sqlx::query_as::<_, EpubRow>(
        r#"
        SELECT id, title, language, created_at, updated_at
        FROM epubs
        WHERE id = $1
        "#,
    )
    .bind(Uuid::parse_str(&id)?)
    .fetch_optional(pool.as_ref())
    .await?;
    
    if let Some(row) = epub_row {
        let epub_id = row.id.to_string();
        let chapters = get_chapters(pool, epub_id.clone()).await?;
        let metadata = get_metadata(pool, epub_id.clone()).await?;
        
        Ok(Some(Epub {
            id: async_graphql::ID::from(row.id.to_string()),
            title: row.title,
            language: row.language,
            created_at: row.created_at.to_rfc3339(),
            updated_at: row.updated_at.to_rfc3339(),
            chapters,
            metadata,
        }))
    } else {
        Ok(None)
    }
}

/// List all EPUBs
pub async fn list_epubs(pool: &PostgresPool) -> Result<Vec<Epub>> {
    let rows = sqlx::query_as::<_, EpubRow>(
        r#"
        SELECT id, title, language, created_at, updated_at
        FROM epubs
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    let mut epubs = Vec::new();
    for row in rows {
        let epub_id = row.id.to_string();
        let chapters = get_chapters(pool, epub_id.clone()).await?;
        let metadata = get_metadata(pool, epub_id.clone()).await?;
        
        epubs.push(Epub {
            id: async_graphql::ID::from(row.id.to_string()),
            title: row.title,
            language: row.language,
            created_at: row.created_at.to_rfc3339(),
            updated_at: row.updated_at.to_rfc3339(),
            chapters,
            metadata,
        });
    }
    
    Ok(epubs)
}

/// Create EPUB
pub async fn create_epub(pool: &PostgresPool, title: String, language: String) -> Result<Epub> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let row = sqlx::query_as!(
        EpubRow,
        r#"
        INSERT INTO epubs (id, title, language, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, language, created_at, updated_at
        "#,
        id,
        title,
        language,
        now,
        now
    )
    .fetch_one(pool.as_ref())
    .await?;
    
    let epub_id = row.id.to_string();
    let chapters = get_chapters(pool, epub_id.clone()).await?;
    let metadata = get_metadata(pool, epub_id.clone()).await?;
    
    Ok(Epub {
        id: async_graphql::ID::from(row.id.to_string()),
        title: row.title,
        language: row.language,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
        chapters,
        metadata,
    })
}

/// Update EPUB
pub async fn update_epub(
    pool: &PostgresPool,
    id: String,
    title: Option<String>,
    language: Option<String>,
) -> Result<Epub> {
    let epub_uuid = Uuid::parse_str(&id)?;
    
    // Update fields individually
    if let Some(t) = &title {
        sqlx::query!(
            "UPDATE epubs SET title = $1, updated_at = NOW() WHERE id = $2",
            t,
            epub_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    if let Some(l) = &language {
        sqlx::query!(
            "UPDATE epubs SET language = $1, updated_at = NOW() WHERE id = $2",
            l,
            epub_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    // Return updated EPUB
    get_epub(pool, id).await?.ok_or("EPUB not found".into())
}

/// Delete EPUB
pub async fn delete_epub(pool: &PostgresPool, id: String) -> Result<bool> {
    let epub_uuid = Uuid::parse_str(&id)?;
    
    let deleted = sqlx::query!(
        r#"
        DELETE FROM epubs WHERE id = $1
        "#,
        epub_uuid
    )
    .execute(pool.as_ref())
    .await?
    .rows_affected();
    
    Ok(deleted > 0)
}

/// Get chapter by ID
pub async fn get_chapter(pool: &PostgresPool, id: String) -> Result<Option<Chapter>> {
    let chapter_uuid = Uuid::parse_str(&id)?;
    
    let row = sqlx::query_as!(
        ChapterRow,
        r#"
        SELECT id, epub_id, title, "order", content_html, created_at, updated_at
        FROM chapters
        WHERE id = $1
        "#,
        chapter_uuid
    )
    .fetch_optional(pool.as_ref())
    .await?;
    
    if let Some(row) = row {
        let chapter_id = row.id.to_string();
        let paragraphs = Vec::new(); // Paragraphs are embedded in content_html for now
        let media = get_media_for_chapter(pool, chapter_id).await?;
        
        Ok(Some(Chapter {
            id: async_graphql::ID::from(row.id.to_string()),
            title: row.title,
            order: row.order,
            content_html: row.content_html,
            paragraphs,
            media,
        }))
    } else {
        Ok(None)
    }
}

/// Get chapters for EPUB
pub async fn get_chapters(pool: &PostgresPool, epub_id: String) -> Result<Vec<Chapter>> {
    let epub_uuid = Uuid::parse_str(&epub_id)?;
    
    let rows = sqlx::query_as!(
        ChapterRow,
        r#"
        SELECT id, epub_id, title, "order", content_html, created_at, updated_at
        FROM chapters
        WHERE epub_id = $1
        ORDER BY "order" ASC
        "#,
        epub_uuid
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    let mut chapters = Vec::new();
    for row in rows {
        let chapter_id = row.id.to_string();
        let paragraphs = Vec::new(); // Paragraphs are embedded in content_html for now
        let media = get_media_for_chapter(pool, chapter_id).await?;
        
        chapters.push(Chapter {
            id: async_graphql::ID::from(row.id.to_string()),
            title: row.title,
            order: row.order,
            content_html: row.content_html,
            paragraphs,
            media,
        });
    }
    
    Ok(chapters)
}

/// Create chapter
pub async fn create_chapter(
    pool: &PostgresPool,
    epub_id: String,
    title: String,
    order: i32,
    content_html: String,
) -> Result<Chapter> {
    let id = Uuid::new_v4();
    let epub_uuid = Uuid::parse_str(&epub_id)?;
    
    let row = sqlx::query_as!(
        ChapterRow,
        r#"
        INSERT INTO chapters (id, epub_id, title, "order", content_html)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, epub_id, title, "order", content_html, created_at, updated_at
        "#,
        id,
        epub_uuid,
        title,
        order,
        content_html
    )
    .fetch_one(pool.as_ref())
    .await?;
    
    let chapter_id = row.id.to_string();
    let paragraphs = Vec::new();
    let media = get_media_for_chapter(pool, chapter_id).await?;
    
    Ok(Chapter {
        id: async_graphql::ID::from(row.id.to_string()),
        title: row.title,
        order: row.order,
        content_html: row.content_html,
        paragraphs,
        media,
    })
}

/// Update chapter
pub async fn update_chapter(
    pool: &PostgresPool,
    id: String,
    title: Option<String>,
    order: Option<i32>,
    content_html: Option<String>,
) -> Result<Chapter> {
    let chapter_uuid = Uuid::parse_str(&id)?;
    
    // Update fields individually
    if let Some(t) = &title {
        sqlx::query!(
            "UPDATE chapters SET title = $1, updated_at = NOW() WHERE id = $2",
            t,
            chapter_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    if let Some(o) = order {
        sqlx::query!(
            "UPDATE chapters SET \"order\" = $1, updated_at = NOW() WHERE id = $2",
            o,
            chapter_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    if let Some(c) = &content_html {
        sqlx::query!(
            "UPDATE chapters SET content_html = $1, updated_at = NOW() WHERE id = $2",
            c,
            chapter_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    // Return updated chapter
    get_chapter(pool, id).await?.ok_or("Chapter not found".into())
}

/// Delete chapter
pub async fn delete_chapter(pool: &PostgresPool, id: String) -> Result<bool> {
    let chapter_uuid = Uuid::parse_str(&id)?;
    
    let deleted = sqlx::query!(
        r#"
        DELETE FROM chapters WHERE id = $1
        "#,
        chapter_uuid
    )
    .execute(pool.as_ref())
    .await?
    .rows_affected();
    
    Ok(deleted > 0)
}

/// Get media by ID
pub async fn get_media(pool: &PostgresPool, id: String) -> Result<Option<Media>> {
    let media_uuid = Uuid::parse_str(&id)?;
    
    let row = sqlx::query_as!(
        MediaRow,
        r#"
        SELECT id, chapter_id, type, url, mime_type, file_size, created_at
        FROM media
        WHERE id = $1
        "#,
        media_uuid
    )
    .fetch_optional(pool.as_ref())
    .await?;
    
    if let Some(row) = row {
        Ok(Some(Media {
            id: async_graphql::ID::from(row.id.to_string()),
            r#type: row.r#type,
            url: row.url,
            mime_type: row.mime_type,
            file_size: row.file_size,
        }))
    } else {
        Ok(None)
    }
}

/// Get media for chapter
async fn get_media_for_chapter(pool: &PostgresPool, chapter_id: String) -> Result<Vec<Media>> {
    let chapter_uuid = Uuid::parse_str(&chapter_id)?;
    
    let rows = sqlx::query_as!(
        MediaRow,
        r#"
        SELECT id, chapter_id, type, url, mime_type, file_size, created_at
        FROM media
        WHERE chapter_id = $1
        "#,
        chapter_uuid
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows
        .into_iter()
        .map(|row| Media {
            id: async_graphql::ID::from(row.id.to_string()),
            r#type: row.r#type,
            url: row.url,
            mime_type: row.mime_type,
            file_size: row.file_size,
        })
        .collect())
}

/// Create media
pub async fn create_media(
    pool: &PostgresPool,
    chapter_id: String,
    r#type: String,
    url: String,
    mime_type: String,
    file_size: i64,
) -> Result<Media> {
    let id = Uuid::new_v4();
    let chapter_uuid = Uuid::parse_str(&chapter_id)?;
    
    let row = sqlx::query_as!(
        MediaRow,
        r#"
        INSERT INTO media (id, chapter_id, type, url, mime_type, file_size)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, chapter_id, type, url, mime_type, file_size, created_at
        "#,
        id,
        chapter_uuid,
        r#type,
        url,
        mime_type,
        file_size
    )
    .fetch_one(pool.as_ref())
    .await?;
    
    Ok(Media {
        id: async_graphql::ID::from(row.id.to_string()),
        r#type: row.r#type,
        url: row.url,
        mime_type: row.mime_type,
        file_size: row.file_size,
    })
}

/// Get metadata for EPUB
pub async fn get_metadata(pool: &PostgresPool, epub_id: String) -> Result<Vec<MetadataItem>> {
    let epub_uuid = Uuid::parse_str(&epub_id)?;
    
    let rows = sqlx::query_as!(
        MetadataRow,
        r#"
        SELECT key, value
        FROM metadata
        WHERE epub_id = $1
        "#,
        epub_uuid
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows
        .into_iter()
        .map(|row| MetadataItem {
            key: row.key,
            value: row.value,
        })
        .collect())
}

/// Update metadata
pub async fn update_metadata(
    pool: &PostgresPool,
    epub_id: String,
    key: String,
    value: String,
) -> Result<MetadataItem> {
    let epub_uuid = Uuid::parse_str(&epub_id)?;
    
    sqlx::query!(
        r#"
        INSERT INTO metadata (epub_id, key, value)
        VALUES ($1, $2, $3)
        ON CONFLICT (epub_id, key) DO UPDATE SET value = $3, updated_at = NOW()
        "#,
        epub_uuid,
        key,
        value
    )
    .execute(pool.as_ref())
    .await?;
    
    Ok(MetadataItem { key, value })
}

/// Ensure default EPUB exists (for "default" project ID)
/// Creates the EPUB if it doesn't exist
pub async fn ensure_default_epub(pool: &PostgresPool, default_epub_id: &str) -> anyhow::Result<()> {
    let epub_uuid = Uuid::parse_str(default_epub_id)?;
    
    // Check if EPUB exists
    let exists: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS(SELECT 1 FROM epubs WHERE id = $1)
        "#,
    )
    .bind(epub_uuid)
    .fetch_one(pool.as_ref())
    .await?;
    
    if !exists {
        // Create default EPUB
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO epubs (id, title, language, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
            "#,
        )
        .bind(epub_uuid)
        .bind("Default Project")
        .bind("en")
        .bind(now)
        .bind(now)
        .execute(pool.as_ref())
        .await?;
    }
    
    Ok(())
}

// Internal row types for sqlx query_as!

#[derive(sqlx::FromRow)]
struct EpubRow {
    id: Uuid,
    title: String,
    language: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct ChapterRow {
    id: Uuid,
    epub_id: Uuid,
    title: String,
    order: i32,
    content_html: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct MediaRow {
    id: Uuid,
    chapter_id: Uuid,
    r#type: String,
    url: String,
    mime_type: String,
    file_size: i64,
    created_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct MetadataRow {
    key: String,
    value: String,
}

// JSON-LD Node Row types

#[derive(sqlx::FromRow)]
struct CharacterRow {
    id: Uuid,
    character_id: String,
    name: String,
    callsign: Option<String>,
    description: Option<String>,
    age: Option<i32>,
    occupation: Option<String>,
    role: Option<String>,
    virtue: Option<String>,
    alternate_name: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct GhostRow {
    id: Uuid,
    ghost_id: String,
    name: String,
    ghost_type: Option<String>,
    description: Option<String>,
    master: Option<String>,
    created_by: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct LocationRow {
    id: Uuid,
    location_id: String,
    name: String,
    description: Option<String>,
    year: Option<i32>,
    hazard_note: Option<String>,
    operational_note: Option<String>,
    security_note: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct OrganizationRow {
    id: Uuid,
    organization_id: String,
    name: String,
    description: Option<String>,
    founder: Option<String>,
    company_type: Option<String>,
    infra_note: Option<String>,
    operational_note: Option<String>,
    security_note: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct CompanyRow {
    id: Uuid,
    company_id: String,
    name: String,
    description: Option<String>,
    founder: Option<String>,
    company_type: Option<String>,
    infra_note: Option<String>,
    operational_note: Option<String>,
    security_note: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct TechnologyRow {
    id: Uuid,
    technology_id: String,
    name: String,
    description: Option<String>,
    certification: Option<String>,
    infra_note: Option<String>,
    operational_note: Option<String>,
    security_note: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct EpisodeRow {
    id: Uuid,
    episode_id: String,
    episode_number: i32,
    season: String,
    name: String,
    logline: Option<String>,
    has_arc: Option<bool>,
    has_scene: Option<bool>,
    has_character: Option<bool>,
    motif_refs: Option<serde_json::Value>,
    antagonist: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct SceneRow {
    id: Uuid,
    scene_id: String,
    name: String,
    same_as: Option<String>,
    description: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct ArcRow {
    id: Uuid,
    arc_id: String,
    name: String,
    spans_seasons: Option<serde_json::Value>,
    phase: Option<String>,
    description: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct MotifRow {
    id: Uuid,
    motif_id: String,
    name: String,
    theme: Option<String>,
    source: Option<String>,
    description: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct SeasonRow {
    id: Uuid,
    season_id: String,
    name: String,
    theme: Option<String>,
    featured_themes: Option<serde_json::Value>,
    source: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct TimelineRow {
    id: Uuid,
    timeline_id: String,
    name: String,
    description: Option<String>,
    influences: Option<serde_json::Value>,
    source: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct EventRow {
    id: Uuid,
    event_id: String,
    name: String,
    description: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    temporal_coverage: Option<String>,
    same_as: Option<serde_json::Value>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct SourceRefRow {
    id: Uuid,
    source_ref_id: String,
    path: String,
    lang: String,
    selection_hint: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct OccupationRow {
    id: Uuid,
    occupation_id: String,
    name: String,
    description: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
struct SettingRow {
    id: Uuid,
    setting_id: String,
    name: String,
    description: Option<String>,
    ghost_type: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

// JSON-LD Node query functions

/// List all characters
pub async fn list_characters(pool: &PostgresPool) -> Result<Vec<Character>> {
    let rows = sqlx::query_as::<_, CharacterRow>(
        r#"
        SELECT id, character_id, name, callsign, description, age, occupation, role, virtue, alternate_name, created_at, updated_at
        FROM characters
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Character {
        id: async_graphql::ID::from(row.id.to_string()),
        character_id: row.character_id,
        name: row.name,
        callsign: row.callsign,
        description: row.description,
        age: row.age,
        occupation: row.occupation,
        role: row.role,
        virtue: row.virtue,
        alternate_name: row.alternate_name,
    }).collect())
}

/// List all ghosts
pub async fn list_ghosts(pool: &PostgresPool) -> Result<Vec<Ghost>> {
    let rows = sqlx::query_as::<_, GhostRow>(
        r#"
        SELECT id, ghost_id, name, ghost_type, description, master, created_by, created_at, updated_at
        FROM ghosts
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Ghost {
        id: async_graphql::ID::from(row.id.to_string()),
        ghost_id: row.ghost_id,
        name: row.name,
        ghost_type: row.ghost_type,
        description: row.description,
        master: row.master,
        created_by: row.created_by,
    }).collect())
}

/// List all locations
pub async fn list_locations(pool: &PostgresPool) -> Result<Vec<Location>> {
    let rows = sqlx::query_as::<_, LocationRow>(
        r#"
        SELECT id, location_id, name, description, year, hazard_note, operational_note, security_note, created_at, updated_at
        FROM locations
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Location {
        id: async_graphql::ID::from(row.id.to_string()),
        location_id: row.location_id,
        name: row.name,
        description: row.description,
        year: row.year,
        hazard_note: row.hazard_note,
        operational_note: row.operational_note,
        security_note: row.security_note,
    }).collect())
}

/// List all organizations
pub async fn list_organizations(pool: &PostgresPool) -> Result<Vec<Organization>> {
    let rows = sqlx::query_as::<_, OrganizationRow>(
        r#"
        SELECT id, organization_id, name, description, founder, company_type, infra_note, operational_note, security_note, created_at, updated_at
        FROM organizations
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Organization {
        id: async_graphql::ID::from(row.id.to_string()),
        organization_id: row.organization_id,
        name: row.name,
        description: row.description,
        founder: row.founder,
        company_type: row.company_type,
        infra_note: row.infra_note,
        operational_note: row.operational_note,
        security_note: row.security_note,
    }).collect())
}

/// List all companies
pub async fn list_companies(pool: &PostgresPool) -> Result<Vec<Company>> {
    let rows = sqlx::query_as::<_, CompanyRow>(
        r#"
        SELECT id, company_id, name, description, founder, company_type, infra_note, operational_note, security_note, created_at, updated_at
        FROM companies
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Company {
        id: async_graphql::ID::from(row.id.to_string()),
        company_id: row.company_id,
        name: row.name,
        description: row.description,
        founder: row.founder,
        company_type: row.company_type,
        infra_note: row.infra_note,
        operational_note: row.operational_note,
        security_note: row.security_note,
    }).collect())
}

/// List all technologies
pub async fn list_technologies(pool: &PostgresPool) -> Result<Vec<Technology>> {
    let rows = sqlx::query_as::<_, TechnologyRow>(
        r#"
        SELECT id, technology_id, name, description, certification, infra_note, operational_note, security_note, created_at, updated_at
        FROM technologies
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Technology {
        id: async_graphql::ID::from(row.id.to_string()),
        technology_id: row.technology_id,
        name: row.name,
        description: row.description,
        certification: row.certification,
        infra_note: row.infra_note,
        operational_note: row.operational_note,
        security_note: row.security_note,
    }).collect())
}

/// List all episodes
pub async fn list_episodes(pool: &PostgresPool) -> Result<Vec<Episode>> {
    let rows = sqlx::query_as::<_, EpisodeRow>(
        r#"
        SELECT id, episode_id, episode_number, season, name, logline, has_arc, has_scene, has_character, motif_refs, antagonist, created_at, updated_at
        FROM episodes
        ORDER BY episode_number ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| {
        let motif_refs = row.motif_refs.and_then(|v| {
            serde_json::from_value::<Vec<String>>(v).ok()
        });
        
        Episode {
            id: async_graphql::ID::from(row.id.to_string()),
            episode_id: row.episode_id,
            episode_number: row.episode_number,
            season: row.season,
            name: row.name,
            logline: row.logline,
            has_arc: row.has_arc,
            has_scene: row.has_scene,
            has_character: row.has_character,
            motif_refs,
            antagonist: row.antagonist,
        }
    }).collect())
}

/// List all scenes
pub async fn list_scenes(pool: &PostgresPool) -> Result<Vec<Scene>> {
    let rows = sqlx::query_as::<_, SceneRow>(
        r#"
        SELECT id, scene_id, name, same_as, description, created_at, updated_at
        FROM scenes
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Scene {
        id: async_graphql::ID::from(row.id.to_string()),
        scene_id: row.scene_id,
        name: row.name,
        same_as: row.same_as,
        description: row.description,
    }).collect())
}

/// List all arcs
pub async fn list_arcs(pool: &PostgresPool) -> Result<Vec<crate::schema::jsonld::Arc>> {
    let rows = sqlx::query_as::<_, ArcRow>(
        r#"
        SELECT id, arc_id, name, spans_seasons, phase, description, created_at, updated_at
        FROM arcs
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| {
        let spans_seasons = row.spans_seasons.and_then(|v| {
            serde_json::from_value::<Vec<String>>(v).ok()
        });
        
        crate::schema::jsonld::Arc {
            id: async_graphql::ID::from(row.id.to_string()),
            arc_id: row.arc_id,
            name: row.name,
            spans_seasons,
            phase: row.phase,
            description: row.description,
        }
    }).collect())
}

/// List all motifs
pub async fn list_motifs(pool: &PostgresPool) -> Result<Vec<Motif>> {
    let rows = sqlx::query_as::<_, MotifRow>(
        r#"
        SELECT id, motif_id, name, theme, source, description, created_at, updated_at
        FROM motifs
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Motif {
        id: async_graphql::ID::from(row.id.to_string()),
        motif_id: row.motif_id,
        name: row.name,
        theme: row.theme,
        source: row.source,
        description: row.description,
    }).collect())
}

/// List all seasons
pub async fn list_seasons(pool: &PostgresPool) -> Result<Vec<Season>> {
    let rows = sqlx::query_as::<_, SeasonRow>(
        r#"
        SELECT id, season_id, name, theme, featured_themes, source, created_at, updated_at
        FROM seasons
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| {
        let featured_themes = row.featured_themes.and_then(|v| {
            serde_json::from_value::<Vec<String>>(v).ok()
        });
        
        Season {
            id: async_graphql::ID::from(row.id.to_string()),
            season_id: row.season_id,
            name: row.name,
            theme: row.theme,
            featured_themes,
            source: row.source,
        }
    }).collect())
}

/// List all timelines
pub async fn list_timelines(pool: &PostgresPool) -> Result<Vec<Timeline>> {
    let rows = sqlx::query_as::<_, TimelineRow>(
        r#"
        SELECT id, timeline_id, name, description, influences, source, created_at, updated_at
        FROM timelines
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| {
        let influences = row.influences.and_then(|v| {
            serde_json::from_value::<Vec<String>>(v).ok()
        });
        
        Timeline {
            id: async_graphql::ID::from(row.id.to_string()),
            timeline_id: row.timeline_id,
            name: row.name,
            description: row.description,
            influences,
            source: row.source,
        }
    }).collect())
}

/// List all events
pub async fn list_events(pool: &PostgresPool) -> Result<Vec<Event>> {
    let rows = sqlx::query_as::<_, EventRow>(
        r#"
        SELECT id, event_id, name, description, start_date, end_date, temporal_coverage, same_as, created_at, updated_at
        FROM events
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| {
        let same_as = row.same_as.and_then(|v| {
            serde_json::from_value::<Vec<String>>(v).ok()
        });
        
        Event {
            id: async_graphql::ID::from(row.id.to_string()),
            event_id: row.event_id,
            name: row.name,
            description: row.description,
            start_date: row.start_date,
            end_date: row.end_date,
            temporal_coverage: row.temporal_coverage,
            same_as,
        }
    }).collect())
}

/// List all source references
pub async fn list_source_refs(pool: &PostgresPool) -> Result<Vec<SourceRef>> {
    let rows = sqlx::query_as::<_, SourceRefRow>(
        r#"
        SELECT id, source_ref_id, path, lang, selection_hint, created_at, updated_at
        FROM source_refs
        ORDER BY path ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| SourceRef {
        id: async_graphql::ID::from(row.id.to_string()),
        source_ref_id: row.source_ref_id,
        path: row.path,
        lang: row.lang,
        selection_hint: row.selection_hint,
    }).collect())
}

/// List all occupations
pub async fn list_occupations(pool: &PostgresPool) -> Result<Vec<Occupation>> {
    let rows = sqlx::query_as::<_, OccupationRow>(
        r#"
        SELECT id, occupation_id, name, description, created_at, updated_at
        FROM occupations
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Occupation {
        id: async_graphql::ID::from(row.id.to_string()),
        occupation_id: row.occupation_id,
        name: row.name,
        description: row.description,
    }).collect())
}

/// List all settings
pub async fn list_settings(pool: &PostgresPool) -> Result<Vec<Setting>> {
    let rows = sqlx::query_as::<_, SettingRow>(
        r#"
        SELECT id, setting_id, name, description, ghost_type, created_at, updated_at
        FROM settings
        ORDER BY name ASC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| Setting {
        id: async_graphql::ID::from(row.id.to_string()),
        setting_id: row.setting_id,
        name: row.name,
        description: row.description,
        ghost_type: row.ghost_type,
    }).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;
    use std::env;

    async fn setup_test_pool() -> PostgresPool {
        let database_url = env::var("TEST_DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5433/postgres".to_string());
        
        let pool = PgPool::connect(&database_url).await.expect("Failed to connect to test database");
        
        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await.expect("Failed to run migrations");
        
        Arc::new(pool)
    }

    async fn cleanup_test_data(pool: &PostgresPool) {
        sqlx::query!("DELETE FROM media").execute(pool.as_ref()).await.ok();
        sqlx::query!("DELETE FROM chapters").execute(pool.as_ref()).await.ok();
        sqlx::query!("DELETE FROM metadata").execute(pool.as_ref()).await.ok();
        sqlx::query!("DELETE FROM epubs").execute(pool.as_ref()).await.ok();
    }

    #[tokio::test]
    async fn test_create_and_get_epub() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        assert_eq!(epub.title, "Test EPUB");
        assert_eq!(epub.language, "en");
        assert!(!epub.id.to_string().is_empty());

        let retrieved = get_epub(&pool, epub.id.to_string())
            .await
            .expect("Failed to get EPUB")
            .expect("EPUB not found");

        assert_eq!(retrieved.title, "Test EPUB");
        assert_eq!(retrieved.language, "en");
    }

    #[tokio::test]
    async fn test_list_epubs() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        create_epub(&pool, "EPUB 1".to_string(), "en".to_string()).await.expect("Failed to create EPUB 1");
        create_epub(&pool, "EPUB 2".to_string(), "ja".to_string()).await.expect("Failed to create EPUB 2");

        let epubs = list_epubs(&pool).await.expect("Failed to list EPUBs");
        assert_eq!(epubs.len(), 2);
    }

    #[tokio::test]
    async fn test_update_epub() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Original Title".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let updated = update_epub(
            &pool,
            epub.id.to_string(),
            Some("Updated Title".to_string()),
            None,
        )
        .await
        .expect("Failed to update EPUB");

        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.language, "en");
    }

    #[tokio::test]
    async fn test_delete_epub() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "To Delete".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let deleted = delete_epub(&pool, epub.id.to_string())
            .await
            .expect("Failed to delete EPUB");

        assert!(deleted);

        let retrieved = get_epub(&pool, epub.id.to_string())
            .await
            .expect("Failed to get EPUB");

        assert!(retrieved.is_none());
    }

    #[tokio::test]
    async fn test_create_and_get_chapter() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let chapter = create_chapter(
            &pool,
            epub.id.to_string(),
            "Chapter 1".to_string(),
            1,
            "<p>Content</p>".to_string(),
        )
        .await
        .expect("Failed to create chapter");

        assert_eq!(chapter.title, "Chapter 1");
        assert_eq!(chapter.order, 1);
        assert_eq!(chapter.content_html, "<p>Content</p>");

        let retrieved = get_chapter(&pool, chapter.id.to_string())
            .await
            .expect("Failed to get chapter")
            .expect("Chapter not found");

        assert_eq!(retrieved.title, "Chapter 1");
    }

    #[tokio::test]
    async fn test_get_chapters_for_epub() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        create_chapter(&pool, epub.id.to_string(), "Chapter 1".to_string(), 1, "".to_string())
            .await
            .expect("Failed to create chapter 1");
        create_chapter(&pool, epub.id.to_string(), "Chapter 2".to_string(), 2, "".to_string())
            .await
            .expect("Failed to create chapter 2");

        let chapters = get_chapters(&pool, epub.id.to_string())
            .await
            .expect("Failed to get chapters");

        assert_eq!(chapters.len(), 2);
        assert_eq!(chapters[0].order, 1);
        assert_eq!(chapters[1].order, 2);
    }

    #[tokio::test]
    async fn test_update_chapter() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let chapter = create_chapter(
            &pool,
            epub.id.to_string(),
            "Original Title".to_string(),
            1,
            "".to_string(),
        )
        .await
        .expect("Failed to create chapter");

        let updated = update_chapter(
            &pool,
            chapter.id.to_string(),
            Some("Updated Title".to_string()),
            None,
            None,
        )
        .await
        .expect("Failed to update chapter");

        assert_eq!(updated.title, "Updated Title");
    }

    #[tokio::test]
    async fn test_delete_chapter() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let chapter = create_chapter(
            &pool,
            epub.id.to_string(),
            "To Delete".to_string(),
            1,
            "".to_string(),
        )
        .await
        .expect("Failed to create chapter");

        let deleted = delete_chapter(&pool, chapter.id.to_string())
            .await
            .expect("Failed to delete chapter");

        assert!(deleted);

        let retrieved = get_chapter(&pool, chapter.id.to_string())
            .await
            .expect("Failed to get chapter");

        assert!(retrieved.is_none());
    }

    #[tokio::test]
    async fn test_create_and_get_media() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let chapter = create_chapter(
            &pool,
            epub.id.to_string(),
            "Chapter 1".to_string(),
            1,
            "".to_string(),
        )
        .await
        .expect("Failed to create chapter");

        let media = create_media(
            &pool,
            chapter.id.to_string(),
            "image".to_string(),
            "https://example.com/image.jpg".to_string(),
            "image/jpeg".to_string(),
            1024,
        )
        .await
        .expect("Failed to create media");

        assert_eq!(media.r#type, "image");
        assert_eq!(media.url, "https://example.com/image.jpg");
        assert_eq!(media.mime_type, "image/jpeg");
        assert_eq!(media.file_size, 1024);

        let retrieved = get_media(&pool, media.id.to_string())
            .await
            .expect("Failed to get media")
            .expect("Media not found");

        assert_eq!(retrieved.r#type, "image");
    }

    #[tokio::test]
    async fn test_update_metadata() {
        let pool = setup_test_pool().await;
        cleanup_test_data(&pool).await;

        let epub = create_epub(&pool, "Test EPUB".to_string(), "en".to_string())
            .await
            .expect("Failed to create EPUB");

        let metadata = update_metadata(
            &pool,
            epub.id.to_string(),
            "author".to_string(),
            "Test Author".to_string(),
        )
        .await
        .expect("Failed to update metadata");

        assert_eq!(metadata.key, "author");
        assert_eq!(metadata.value, "Test Author");

        let all_metadata = get_metadata(&pool, epub.id.to_string())
            .await
            .expect("Failed to get metadata");

        assert_eq!(all_metadata.len(), 1);
        assert_eq!(all_metadata[0].key, "author");
        assert_eq!(all_metadata[0].value, "Test Author");
    }
}

// Graph operations

/// Row structure for graph_links table
#[derive(sqlx::FromRow)]
struct GraphLinkRow {
    id: Uuid,
    source_node_type: String,
    source_node_id: Uuid,
    target_node_type: String,
    target_node_id: Uuid,
    link_type: String,
    properties: Option<Value>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

/// Row structure for graph_incidences table
#[derive(sqlx::FromRow)]
struct GraphIncidenceRow {
    id: Uuid,
    node_type: String,
    node_id: Uuid,
    link_id: Uuid,
    role: String,
    properties: Option<Value>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

/// List all graph links
pub async fn list_graph_links(pool: &PostgresPool) -> Result<Vec<GraphLink>> {
    let rows = sqlx::query_as::<_, GraphLinkRow>(
        r#"
        SELECT id, source_node_type, source_node_id, target_node_type, target_node_id, link_type, properties, created_at, updated_at
        FROM graph_links
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| GraphLink {
        id: async_graphql::ID::from(row.id.to_string()),
        source_node_type: row.source_node_type,
        source_node_id: async_graphql::ID::from(row.source_node_id.to_string()),
        target_node_type: row.target_node_type,
        target_node_id: async_graphql::ID::from(row.target_node_id.to_string()),
        link_type: row.link_type,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    }).collect())
}

/// Get graph links for a specific node
pub async fn get_graph_links_for_node(
    pool: &PostgresPool,
    node_type: String,
    node_id: String,
) -> Result<Vec<GraphLink>> {
    let node_uuid = Uuid::parse_str(&node_id)?;
    
    let rows = sqlx::query_as::<_, GraphLinkRow>(
        r#"
        SELECT id, source_node_type, source_node_id, target_node_type, target_node_id, link_type, properties, created_at, updated_at
        FROM graph_links
        WHERE (source_node_type = $1 AND source_node_id = $2)
           OR (target_node_type = $1 AND target_node_id = $2)
        ORDER BY created_at DESC
        "#,
    )
    .bind(&node_type)
    .bind(node_uuid)
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| GraphLink {
        id: async_graphql::ID::from(row.id.to_string()),
        source_node_type: row.source_node_type,
        source_node_id: async_graphql::ID::from(row.source_node_id.to_string()),
        target_node_type: row.target_node_type,
        target_node_id: async_graphql::ID::from(row.target_node_id.to_string()),
        link_type: row.link_type,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    }).collect())
}

/// Create a graph link
pub async fn create_graph_link(
    pool: &PostgresPool,
    input: CreateGraphLinkInput,
) -> Result<GraphLink> {
    let id = Uuid::new_v4();
    let source_node_uuid = Uuid::parse_str(input.source_node_id.as_str())?;
    let target_node_uuid = Uuid::parse_str(input.target_node_id.as_str())?;
    let properties = input.properties.unwrap_or_else(|| Value::Object(serde_json::Map::new()));
    
    let row = sqlx::query_as::<_, GraphLinkRow>(
        r#"
        INSERT INTO graph_links (id, source_node_type, source_node_id, target_node_type, target_node_id, link_type, properties)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, source_node_type, source_node_id, target_node_type, target_node_id, link_type, properties, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&input.source_node_type)
    .bind(source_node_uuid)
    .bind(&input.target_node_type)
    .bind(target_node_uuid)
    .bind(&input.link_type)
    .bind(&properties)
    .fetch_one(pool.as_ref())
    .await?;
    
    Ok(GraphLink {
        id: async_graphql::ID::from(row.id.to_string()),
        source_node_type: row.source_node_type,
        source_node_id: async_graphql::ID::from(row.source_node_id.to_string()),
        target_node_type: row.target_node_type,
        target_node_id: async_graphql::ID::from(row.target_node_id.to_string()),
        link_type: row.link_type,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    })
}

/// Update a graph link
pub async fn update_graph_link(
    pool: &PostgresPool,
    input: UpdateGraphLinkInput,
) -> Result<GraphLink> {
    let link_uuid = Uuid::parse_str(input.id.as_str())?;
    
    // Update fields individually using parameterized queries
    if let Some(link_type) = &input.link_type {
        sqlx::query!(
            "UPDATE graph_links SET link_type = $1, updated_at = NOW() WHERE id = $2",
            link_type,
            link_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    if let Some(properties) = &input.properties {
        sqlx::query!(
            "UPDATE graph_links SET properties = $1, updated_at = NOW() WHERE id = $2",
            properties,
            link_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    // Return updated link
    let row = sqlx::query_as::<_, GraphLinkRow>(
        r#"
        SELECT id, source_node_type, source_node_id, target_node_type, target_node_id, link_type, properties, created_at, updated_at
        FROM graph_links
        WHERE id = $1
        "#,
    )
    .bind(link_uuid)
    .fetch_one(pool.as_ref())
    .await?;
    
    Ok(GraphLink {
        id: async_graphql::ID::from(row.id.to_string()),
        source_node_type: row.source_node_type,
        source_node_id: async_graphql::ID::from(row.source_node_id.to_string()),
        target_node_type: row.target_node_type,
        target_node_id: async_graphql::ID::from(row.target_node_id.to_string()),
        link_type: row.link_type,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    })
}

/// Delete a graph link
pub async fn delete_graph_link(pool: &PostgresPool, id: String) -> Result<bool> {
    let link_uuid = Uuid::parse_str(&id)?;
    
    let deleted = sqlx::query!(
        r#"
        DELETE FROM graph_links WHERE id = $1
        "#,
        link_uuid
    )
    .execute(pool.as_ref())
    .await?
    .rows_affected();
    
    Ok(deleted > 0)
}

/// List all graph incidences
pub async fn list_graph_incidences(pool: &PostgresPool) -> Result<Vec<GraphIncidence>> {
    let rows = sqlx::query_as::<_, GraphIncidenceRow>(
        r#"
        SELECT id, node_type, node_id, link_id, role, properties, created_at, updated_at
        FROM graph_incidences
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| GraphIncidence {
        id: async_graphql::ID::from(row.id.to_string()),
        node_type: row.node_type,
        node_id: async_graphql::ID::from(row.node_id.to_string()),
        link_id: async_graphql::ID::from(row.link_id.to_string()),
        role: row.role,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    }).collect())
}

/// Get graph incidences for a specific link
pub async fn get_graph_incidences_for_link(
    pool: &PostgresPool,
    link_id: String,
) -> Result<Vec<GraphIncidence>> {
    let link_uuid = Uuid::parse_str(&link_id)?;
    
    let rows = sqlx::query_as::<_, GraphIncidenceRow>(
        r#"
        SELECT id, node_type, node_id, link_id, role, properties, created_at, updated_at
        FROM graph_incidences
        WHERE link_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(link_uuid)
    .fetch_all(pool.as_ref())
    .await?;
    
    Ok(rows.into_iter().map(|row| GraphIncidence {
        id: async_graphql::ID::from(row.id.to_string()),
        node_type: row.node_type,
        node_id: async_graphql::ID::from(row.node_id.to_string()),
        link_id: async_graphql::ID::from(row.link_id.to_string()),
        role: row.role,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    }).collect())
}

/// Create a graph incidence
pub async fn create_graph_incidence(
    pool: &PostgresPool,
    input: CreateGraphIncidenceInput,
) -> Result<GraphIncidence> {
    let id = Uuid::new_v4();
    let node_uuid = Uuid::parse_str(input.node_id.as_str())?;
    let link_uuid = Uuid::parse_str(input.link_id.as_str())?;
    let properties = input.properties.unwrap_or_else(|| Value::Object(serde_json::Map::new()));
    
    let row = sqlx::query_as::<_, GraphIncidenceRow>(
        r#"
        INSERT INTO graph_incidences (id, node_type, node_id, link_id, role, properties)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, node_type, node_id, link_id, role, properties, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&input.node_type)
    .bind(node_uuid)
    .bind(link_uuid)
    .bind(&input.role)
    .bind(&properties)
    .fetch_one(pool.as_ref())
    .await?;
    
    Ok(GraphIncidence {
        id: async_graphql::ID::from(row.id.to_string()),
        node_type: row.node_type,
        node_id: async_graphql::ID::from(row.node_id.to_string()),
        link_id: async_graphql::ID::from(row.link_id.to_string()),
        role: row.role,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    })
}

/// Update a graph incidence
pub async fn update_graph_incidence(
    pool: &PostgresPool,
    input: UpdateGraphIncidenceInput,
) -> Result<GraphIncidence> {
    let incidence_uuid = Uuid::parse_str(input.id.as_str())?;
    
    // Update fields individually using parameterized queries
    if let Some(role) = &input.role {
        sqlx::query!(
            "UPDATE graph_incidences SET role = $1, updated_at = NOW() WHERE id = $2",
            role,
            incidence_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    if let Some(properties) = &input.properties {
        sqlx::query!(
            "UPDATE graph_incidences SET properties = $1, updated_at = NOW() WHERE id = $2",
            properties,
            incidence_uuid
        )
        .execute(pool.as_ref())
        .await?;
    }
    
    // Return updated incidence
    let row = sqlx::query_as::<_, GraphIncidenceRow>(
        r#"
        SELECT id, node_type, node_id, link_id, role, properties, created_at, updated_at
        FROM graph_incidences
        WHERE id = $1
        "#,
    )
    .bind(incidence_uuid)
    .fetch_one(pool.as_ref())
    .await?;
    
    Ok(GraphIncidence {
        id: async_graphql::ID::from(row.id.to_string()),
        node_type: row.node_type,
        node_id: async_graphql::ID::from(row.node_id.to_string()),
        link_id: async_graphql::ID::from(row.link_id.to_string()),
        role: row.role,
        properties: row.properties,
        created_at: row.created_at.to_rfc3339(),
        updated_at: row.updated_at.to_rfc3339(),
    })
}

/// Delete a graph incidence
pub async fn delete_graph_incidence(pool: &PostgresPool, id: String) -> Result<bool> {
    let incidence_uuid = Uuid::parse_str(&id)?;
    
    let deleted = sqlx::query!(
        r#"
        DELETE FROM graph_incidences WHERE id = $1
        "#,
        incidence_uuid
    )
    .execute(pool.as_ref())
    .await?
    .rows_affected();
    
    Ok(deleted > 0)
}
