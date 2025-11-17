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
