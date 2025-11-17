/**
 * Database Client
 * SQLx + PostgreSQL を使用したリレーショナルデータベース操作
 * 
 * @context {
 *   "@id": "ex:DatabaseClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:DocumentStorage"
 * }
 */

use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::sync::{Arc, OnceLock};
use tracing::info;

use crate::database::schema::*;

static POOL: OnceLock<Arc<PgPool>> = OnceLock::new();

/// PostgreSQL 接続プールを初期化
/// 
/// @context {
///   "@id": "ex:initializeDatabase",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:InitializedPool"
/// }
pub async fn initialize() -> Result<()> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/postgres".to_string());

    info!("Connecting to PostgreSQL at {}", database_url);

    // 接続プールを作成（最大10接続）
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // マイグレーションを実行
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    POOL.set(Arc::new(pool)).map_err(|_| {
        anyhow::anyhow!("Database pool already initialized")
    })?;

    info!("Database client initialized successfully");
    Ok(())
}

/// 接続プールを取得
/// 
/// @context {
///   "@id": "ex:getDatabasePool",
///   "@type": "ex:Activity",
///   "ex:produces": "ex:DatabasePool"
/// }
pub fn get_pool() -> Result<Arc<PgPool>> {
    POOL.get().cloned().ok_or_else(|| {
        anyhow::anyhow!("Database pool not initialized. Call initialize() first.")
    })
}

// ==================== Projects ====================

/// プロジェクトを取得
pub async fn get_project(id: &str) -> Result<Option<Project>> {
    let pool = get_pool()?;
    let project = sqlx::query_as::<_, Project>(
        "SELECT id, name, author, description, status, created_at, updated_at FROM projects WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(project)
}

/// すべてのプロジェクトを取得
pub async fn get_all_projects() -> Result<Vec<Project>> {
    let pool = get_pool()?;
    let projects = sqlx::query_as::<_, Project>(
        "SELECT id, name, author, description, status, created_at, updated_at FROM projects ORDER BY created_at DESC"
    )
    .fetch_all(pool.as_ref())
    .await?;
    Ok(projects)
}

/// プロジェクトを作成
pub async fn create_project(project: &Project) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO projects (id, name, author, description, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(&project.id)
    .bind(&project.name)
    .bind(&project.author)
    .bind(&project.description)
    .bind(&project.status)
    .bind(project.created_at)
    .bind(project.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// プロジェクトを更新
pub async fn update_project(project: &Project) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE projects SET name = $2, author = $3, description = $4, status = $5, updated_at = $6 
         WHERE id = $1"
    )
    .bind(&project.id)
    .bind(&project.name)
    .bind(&project.author)
    .bind(&project.description)
    .bind(&project.status)
    .bind(project.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// プロジェクトを削除
pub async fn delete_project(id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("DELETE FROM projects WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    Ok(())
}

// ==================== Stories ====================

/// Storyを取得
pub async fn get_story(id: &str) -> Result<Option<Story>> {
    let pool = get_pool()?;
    let story = sqlx::query_as::<_, Story>(
        "SELECT id, title, content, created_at, updated_at FROM stories WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(story)
}

/// すべてのStoryを取得
pub async fn get_all_stories() -> Result<Vec<Story>> {
    let pool = get_pool()?;
    let stories = sqlx::query_as::<_, Story>(
        "SELECT id, title, content, created_at, updated_at FROM stories ORDER BY created_at DESC"
    )
    .fetch_all(pool.as_ref())
    .await?;
    Ok(stories)
}

/// Storyを作成
pub async fn create_story(story: &Story) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO stories (id, title, content, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(&story.id)
    .bind(&story.title)
    .bind(&story.content)
    .bind(story.created_at)
    .bind(story.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Storyを更新
pub async fn update_story(story: &Story) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE stories SET title = $2, content = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&story.id)
    .bind(&story.title)
    .bind(&story.content)
    .bind(story.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Storyを削除
pub async fn delete_story(id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("DELETE FROM stories WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    Ok(())
}

// ==================== Scripts ====================

/// Scriptを取得
pub async fn get_script(id: &str) -> Result<Option<Script>> {
    let pool = get_pool()?;
    let script = sqlx::query_as::<_, Script>(
        "SELECT id, script_text, derived_from_story, status, created_at, updated_at FROM scripts WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(script)
}

/// すべてのScriptを取得
pub async fn get_all_scripts() -> Result<Vec<Script>> {
    let pool = get_pool()?;
    let scripts = sqlx::query_as::<_, Script>(
        "SELECT id, script_text, derived_from_story, status, created_at, updated_at FROM scripts ORDER BY created_at DESC"
    )
    .fetch_all(pool.as_ref())
    .await?;
    Ok(scripts)
}

/// Scriptを作成
pub async fn create_script(script: &Script) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO scripts (id, script_text, derived_from_story, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(&script.id)
    .bind(&script.script_text)
    .bind(&script.derived_from_story)
    .bind(&script.status)
    .bind(script.created_at)
    .bind(script.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Scriptを更新
pub async fn update_script(script: &Script) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE scripts SET script_text = $2, status = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&script.id)
    .bind(&script.script_text)
    .bind(&script.status)
    .bind(script.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Scriptを削除
pub async fn delete_script(id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("DELETE FROM scripts WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    Ok(())
}

// ==================== Metadata ====================

/// Metadataを取得
pub async fn get_metadata(id: &str) -> Result<Option<Metadata>> {
    let pool = get_pool()?;
    let metadata = sqlx::query_as::<_, Metadata>(
        "SELECT id, title, author, isbn, language, publisher, date, description, created_at, updated_at FROM metadata WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(metadata)
}

/// Metadataを作成
pub async fn create_metadata(metadata: &Metadata) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO metadata (id, title, author, isbn, language, publisher, date, description, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    .bind(&metadata.id)
    .bind(&metadata.title)
    .bind(&metadata.author)
    .bind(&metadata.isbn)
    .bind(&metadata.language)
    .bind(&metadata.publisher)
    .bind(&metadata.date)
    .bind(&metadata.description)
    .bind(metadata.created_at)
    .bind(metadata.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Metadataを更新
pub async fn update_metadata(metadata: &Metadata) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE metadata SET title = $2, author = $3, isbn = $4, language = $5, publisher = $6, date = $7, description = $8, updated_at = $9 WHERE id = $1"
    )
    .bind(&metadata.id)
    .bind(&metadata.title)
    .bind(&metadata.author)
    .bind(&metadata.isbn)
    .bind(&metadata.language)
    .bind(&metadata.publisher)
    .bind(&metadata.date)
    .bind(&metadata.description)
    .bind(metadata.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

// ==================== EPUB Documents ====================

/// EPUBDocumentを取得
pub async fn get_epub_document(id: &str) -> Result<Option<EPUBDocument>> {
    let pool = get_pool()?;
    let epub = sqlx::query_as::<_, EPUBDocument>(
        "SELECT id, title, metadata_id, created_at, updated_at FROM epub_documents WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(epub)
}

/// EPUBDocumentを作成
pub async fn create_epub_document(epub: &EPUBDocument) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO epub_documents (id, title, metadata_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(&epub.id)
    .bind(&epub.title)
    .bind(&epub.metadata_id)
    .bind(epub.created_at)
    .bind(epub.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// EPUBDocumentを更新
pub async fn update_epub_document(epub: &EPUBDocument) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE epub_documents SET title = $2, metadata_id = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&epub.id)
    .bind(&epub.title)
    .bind(&epub.metadata_id)
    .bind(epub.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

// ==================== Kindle Documents ====================

/// KindleDocumentを取得
pub async fn get_kindle_document(id: &str) -> Result<Option<KindleDocument>> {
    let pool = get_pool()?;
    let kindle = sqlx::query_as::<_, KindleDocument>(
        "SELECT id, title, metadata_id, created_at, updated_at FROM kindle_documents WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(kindle)
}

/// KindleDocumentを作成
pub async fn create_kindle_document(kindle: &KindleDocument) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO kindle_documents (id, title, metadata_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(&kindle.id)
    .bind(&kindle.title)
    .bind(&kindle.metadata_id)
    .bind(kindle.created_at)
    .bind(kindle.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// KindleDocumentを更新
pub async fn update_kindle_document(kindle: &KindleDocument) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE kindle_documents SET title = $2, metadata_id = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&kindle.id)
    .bind(&kindle.title)
    .bind(&kindle.metadata_id)
    .bind(kindle.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

// ==================== Chapters ====================

/// Chapterを取得
pub async fn get_chapter(id: &str) -> Result<Option<Chapter>> {
    let pool = get_pool()?;
    let chapter = sqlx::query_as::<_, Chapter>(
        "SELECT id, epub_document_id, kindle_document_id, title, \"order\", created_at, updated_at FROM chapters WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(chapter)
}

/// ドキュメントのすべてのChapterを取得
pub async fn get_chapters_by_document(document_id: &str, is_epub: bool) -> Result<Vec<Chapter>> {
    let pool = get_pool()?;
    let chapters = if is_epub {
        sqlx::query_as::<_, Chapter>(
            "SELECT id, epub_document_id, kindle_document_id, title, \"order\", created_at, updated_at 
             FROM chapters WHERE epub_document_id = $1 ORDER BY \"order\" ASC"
        )
        .bind(document_id)
        .fetch_all(pool.as_ref())
        .await?
    } else {
        sqlx::query_as::<_, Chapter>(
            "SELECT id, epub_document_id, kindle_document_id, title, \"order\", created_at, updated_at 
             FROM chapters WHERE kindle_document_id = $1 ORDER BY \"order\" ASC"
        )
        .bind(document_id)
        .fetch_all(pool.as_ref())
        .await?
    };
    Ok(chapters)
}

/// Chapterを作成
pub async fn create_chapter(chapter: &Chapter) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO chapters (id, epub_document_id, kindle_document_id, title, \"order\", created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(&chapter.id)
    .bind(&chapter.epub_document_id)
    .bind(&chapter.kindle_document_id)
    .bind(&chapter.title)
    .bind(chapter.order)
    .bind(chapter.created_at)
    .bind(chapter.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Chapterを更新
pub async fn update_chapter(chapter: &Chapter) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE chapters SET title = $2, \"order\" = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&chapter.id)
    .bind(&chapter.title)
    .bind(chapter.order)
    .bind(chapter.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

// ==================== Sections ====================

/// Sectionを取得
pub async fn get_section(id: &str) -> Result<Option<Section>> {
    let pool = get_pool()?;
    let section = sqlx::query_as::<_, Section>(
        "SELECT id, chapter_id, title, \"order\", created_at, updated_at FROM sections WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(section)
}

/// ChapterのすべてのSectionを取得
pub async fn get_sections_by_chapter(chapter_id: &str) -> Result<Vec<Section>> {
    let pool = get_pool()?;
    let sections = sqlx::query_as::<_, Section>(
        "SELECT id, chapter_id, title, \"order\", created_at, updated_at 
         FROM sections WHERE chapter_id = $1 ORDER BY \"order\" ASC"
    )
    .bind(chapter_id)
    .fetch_all(pool.as_ref())
    .await?;
    Ok(sections)
}

/// Sectionを作成
pub async fn create_section(section: &Section) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO sections (id, chapter_id, title, \"order\", created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6)"
    )
    .bind(&section.id)
    .bind(&section.chapter_id)
    .bind(&section.title)
    .bind(section.order)
    .bind(section.created_at)
    .bind(section.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Sectionを更新
pub async fn update_section(section: &Section) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE sections SET title = $2, \"order\" = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&section.id)
    .bind(&section.title)
    .bind(section.order)
    .bind(section.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

// ==================== Paragraphs ====================

/// Paragraphを取得
pub async fn get_paragraph(id: &str) -> Result<Option<Paragraph>> {
    let pool = get_pool()?;
    let paragraph = sqlx::query_as::<_, Paragraph>(
        "SELECT id, chapter_id, section_id, \"order\", style, created_at, updated_at FROM paragraphs WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(paragraph)
}

/// ChapterまたはSectionのすべてのParagraphを取得
pub async fn get_paragraphs_by_parent(chapter_id: Option<&str>, section_id: Option<&str>) -> Result<Vec<Paragraph>> {
    let pool = get_pool()?;
    let paragraphs = if let Some(cid) = chapter_id {
        sqlx::query_as::<_, Paragraph>(
            "SELECT id, chapter_id, section_id, \"order\", style, created_at, updated_at 
             FROM paragraphs WHERE chapter_id = $1 ORDER BY \"order\" ASC"
        )
        .bind(cid)
        .fetch_all(pool.as_ref())
        .await?
    } else if let Some(sid) = section_id {
        sqlx::query_as::<_, Paragraph>(
            "SELECT id, chapter_id, section_id, \"order\", style, created_at, updated_at 
             FROM paragraphs WHERE section_id = $1 ORDER BY \"order\" ASC"
        )
        .bind(sid)
        .fetch_all(pool.as_ref())
        .await?
    } else {
        return Err(anyhow::anyhow!("Either chapter_id or section_id must be provided"));
    };
    Ok(paragraphs)
}

/// EPUB DocumentのすべてのParagraphを取得（Chapterを経由）
pub async fn get_paragraphs_by_epub_document(document_id: &str) -> Result<Vec<Paragraph>> {
    let pool = get_pool()?;
    let paragraphs = sqlx::query_as::<_, Paragraph>(
        "SELECT p.id, p.chapter_id, p.section_id, p.\"order\", p.style, p.created_at, p.updated_at 
         FROM paragraphs p
         INNER JOIN chapters c ON p.chapter_id = c.id
         WHERE c.epub_document_id = $1
         ORDER BY c.\"order\" ASC, p.\"order\" ASC"
    )
    .bind(document_id)
    .fetch_all(pool.as_ref())
    .await?;
    Ok(paragraphs)
}

/// Paragraphを作成
pub async fn create_paragraph(paragraph: &Paragraph) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO paragraphs (id, chapter_id, section_id, \"order\", style, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(&paragraph.id)
    .bind(&paragraph.chapter_id)
    .bind(&paragraph.section_id)
    .bind(paragraph.order)
    .bind(&paragraph.style)
    .bind(paragraph.created_at)
    .bind(paragraph.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// Paragraphを更新
pub async fn update_paragraph(paragraph: &Paragraph) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE paragraphs SET \"order\" = $2, style = $3, updated_at = $4 WHERE id = $1"
    )
    .bind(&paragraph.id)
    .bind(paragraph.order)
    .bind(&paragraph.style)
    .bind(paragraph.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

// ==================== Text Nodes ====================

/// TextNodeを取得
pub async fn get_text_node(id: &str) -> Result<Option<TextNode>> {
    let pool = get_pool()?;
    let text_node = sqlx::query_as::<_, TextNode>(
        "SELECT id, paragraph_id, content, \"order\", style, created_at, updated_at FROM text_nodes WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool.as_ref())
    .await?;
    Ok(text_node)
}

/// ParagraphのすべてのTextNodeを取得
pub async fn get_text_nodes_by_paragraph(paragraph_id: &str) -> Result<Vec<TextNode>> {
    let pool = get_pool()?;
    let text_nodes = sqlx::query_as::<_, TextNode>(
        "SELECT id, paragraph_id, content, \"order\", style, created_at, updated_at 
         FROM text_nodes WHERE paragraph_id = $1 ORDER BY \"order\" ASC"
    )
    .bind(paragraph_id)
    .fetch_all(pool.as_ref())
    .await?;
    Ok(text_nodes)
}

/// TextNodeを作成
pub async fn create_text_node(text_node: &TextNode) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "INSERT INTO text_nodes (id, paragraph_id, content, \"order\", style, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)"
    )
    .bind(&text_node.id)
    .bind(&text_node.paragraph_id)
    .bind(&text_node.content)
    .bind(text_node.order)
    .bind(&text_node.style)
    .bind(text_node.created_at)
    .bind(text_node.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// TextNodeを更新
pub async fn update_text_node(text_node: &TextNode) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query(
        "UPDATE text_nodes SET content = $2, \"order\" = $3, style = $4, updated_at = $5 WHERE id = $1"
    )
    .bind(&text_node.id)
    .bind(&text_node.content)
    .bind(text_node.order)
    .bind(&text_node.style)
    .bind(text_node.updated_at)
    .execute(pool.as_ref())
    .await?;
    Ok(())
}

/// TextNodeを削除
pub async fn delete_text_node(id: &str) -> Result<()> {
    let pool = get_pool()?;
    sqlx::query("DELETE FROM text_nodes WHERE id = $1")
        .bind(id)
        .execute(pool.as_ref())
        .await?;
    Ok(())
}
