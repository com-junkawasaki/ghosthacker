/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:System
 * @id https://gftd.ai/performer/system/postgresql
 * 
 * PostgreSQL database connection and query implementation using sqlx
 */
use async_graphql::Result;
use sqlx::{PgPool, Postgres, Pool};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::schema::epub::{Epub, Chapter, Paragraph, Media, MetadataItem};

pub type PostgresPool = Arc<PgPool>;

/// Create PostgreSQL connection pool
pub async fn create_pool() -> anyhow::Result<PostgresPool> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string());
    
    let pool = PgPool::connect(&database_url).await?;
    
    // Run migrations manually - execute each statement separately
    let migration_sql = include_str!("../../migrations/001_initial_schema.sql");
    // Split by semicolon and execute each statement
    for statement in migration_sql.split(';') {
        let trimmed = statement.trim();
        if !trimmed.is_empty() && !trimmed.starts_with("--") {
            if let Err(e) = sqlx::query(trimmed).execute(&pool).await {
                // Ignore errors for statements that might already exist (e.g., CREATE TABLE IF NOT EXISTS)
                eprintln!("Migration warning: {}", e);
            }
        }
    }
    
    Ok(Arc::new(pool))
}

/// Get EPUB by ID
pub async fn get_epub(pool: &PostgresPool, id: String) -> Result<Option<Epub>> {
    let epub_row = sqlx::query_as!(
        EpubRow,
        r#"
        SELECT id, title, language, created_at, updated_at
        FROM epubs
        WHERE id = $1
        "#,
        Uuid::parse_str(&id)?
    )
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
    let rows = sqlx::query_as!(
        EpubRow,
        r#"
        SELECT id, title, language, created_at, updated_at
        FROM epubs
        ORDER BY created_at DESC
        "#
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

