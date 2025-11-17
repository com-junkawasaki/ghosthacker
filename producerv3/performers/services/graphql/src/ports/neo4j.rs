/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:System
 * @id https://gftd.ai/performer/system/neo4j
 * 
 * Neo4j database connection and query implementation
 */
use async_graphql::Result;
use neo4rs::{Graph, Node, Relation, Row};
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;
use crate::schema::epub::{Epub, Chapter, Paragraph, Media, MetadataItem};

pub type Neo4jPool = Arc<Graph>;

/// Create Neo4j connection pool
pub async fn create_pool() -> anyhow::Result<Neo4jPool> {
    let uri = std::env::var("NEO4J_URI").unwrap_or_else(|_| "bolt://localhost:7687".to_string());
    let user = std::env::var("NEO4J_USER").unwrap_or_else(|_| "neo4j".to_string());
    let password = std::env::var("NEO4J_PASSWORD").unwrap_or_else(|_| "password".to_string());
    
    let graph = Graph::new(&uri, &user, &password).await?;
    
    // Create indexes
    let mut result = graph.execute(
        neo4rs::query("CREATE INDEX IF NOT EXISTS FOR (e:Epub) ON (e.id)")
    ).await?;
    result.next().await?;
    
    let mut result = graph.execute(
        neo4rs::query("CREATE INDEX IF NOT EXISTS FOR (c:Chapter) ON (c.id)")
    ).await?;
    result.next().await?;
    
    let mut result = graph.execute(
        neo4rs::query("CREATE INDEX IF NOT EXISTS FOR (m:Media) ON (m.id)")
    ).await?;
    result.next().await?;
    
    Ok(Arc::new(graph))
}

/// Get EPUB by ID
pub async fn get_epub(pool: &Neo4jPool, id: String) -> Result<Option<Epub>> {
    let mut result = pool.execute(
        neo4rs::query("MATCH (e:Epub {id: $id}) RETURN e")
            .param("id", id.clone())
    ).await?;
    
    if let Some(row) = result.next().await? {
        let node: Node = row.get("e")?;
        let epub = node_to_epub(node, pool).await?;
        Ok(Some(epub))
    } else {
        Ok(None)
    }
}

/// List all EPUBs
pub async fn list_epubs(pool: &Neo4jPool) -> Result<Vec<Epub>> {
    let mut result = pool.execute(
        neo4rs::query("MATCH (e:Epub) RETURN e ORDER BY e.created_at DESC")
    ).await?;
    
    let mut epubs = Vec::new();
    while let Some(row) = result.next().await? {
        let node: Node = row.get("e")?;
        if let Ok(epub) = node_to_epub(node, pool).await {
            epubs.push(epub);
        }
    }
    Ok(epubs)
}

/// Create EPUB
pub async fn create_epub(pool: &Neo4jPool, title: String, language: String) -> Result<Epub> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    let mut result = pool.execute(
        neo4rs::query(
            "CREATE (e:Epub {
                id: $id,
                title: $title,
                language: $language,
                created_at: $created_at,
                updated_at: $updated_at
            }) RETURN e"
        )
        .param("id", id.clone())
        .param("title", title.clone())
        .param("language", language.clone())
        .param("created_at", now.to_rfc3339())
        .param("updated_at", now.to_rfc3339())
    ).await?;
    
    let row = result.next().await?.ok_or("Failed to create EPUB")?;
    let node: Node = row.get("e")?;
    node_to_epub(node, pool).await
}

/// Update EPUB
pub async fn update_epub(
    pool: &Neo4jPool,
    id: String,
    title: Option<String>,
    language: Option<String>,
) -> Result<Epub> {
    let mut updates = Vec::new();
    if let Some(t) = &title {
        updates.push(format!("e.title = '{}'", t.replace('\'', "\\'")));
    }
    if let Some(l) = &language {
        updates.push(format!("e.language = '{}'", l.replace('\'', "\\'")));
    }
    updates.push("e.updated_at = datetime()".to_string());
    
    let query = format!(
        "MATCH (e:Epub {{id: $id}}) SET {} RETURN e",
        updates.join(", ")
    );
    
    let mut result = pool.execute(
        neo4rs::query(&query).param("id", id.clone())
    ).await?;
    
    let row = result.next().await?.ok_or("EPUB not found")?;
    let node: Node = row.get("e")?;
    node_to_epub(node, pool).await
}

/// Delete EPUB
pub async fn delete_epub(pool: &Neo4jPool, id: String) -> Result<bool> {
    let mut result = pool.execute(
        neo4rs::query("MATCH (e:Epub {id: $id}) DETACH DELETE e RETURN count(e) as deleted")
            .param("id", id)
    ).await?;
    
    if let Some(row) = result.next().await? {
        let deleted: i64 = row.get("deleted")?;
        Ok(deleted > 0)
    } else {
        Ok(false)
    }
}

/// Get chapter by ID
pub async fn get_chapter(pool: &Neo4jPool, id: String) -> Result<Option<Chapter>> {
    let mut result = pool.execute(
        neo4rs::query("MATCH (c:Chapter {id: $id}) RETURN c")
            .param("id", id.clone())
    ).await?;
    
    if let Some(row) = result.next().await? {
        let node: Node = row.get("c")?;
        let chapter = node_to_chapter(node, pool).await?;
        Ok(Some(chapter))
    } else {
        Ok(None)
    }
}

/// Get chapters for EPUB
pub async fn get_chapters(pool: &Neo4jPool, epub_id: String) -> Result<Vec<Chapter>> {
    let mut result = pool.execute(
        neo4rs::query(
            "MATCH (e:Epub {id: $epub_id})-[:HAS_CHAPTER]->(c:Chapter)
             RETURN c ORDER BY c.order ASC"
        )
        .param("epub_id", epub_id)
    ).await?;
    
    let mut chapters = Vec::new();
    while let Some(row) = result.next().await? {
        let node: Node = row.get("c")?;
        if let Ok(chapter) = node_to_chapter(node, pool).await {
            chapters.push(chapter);
        }
    }
    Ok(chapters)
}

/// Create chapter
pub async fn create_chapter(
    pool: &Neo4jPool,
    epub_id: String,
    title: String,
    order: i32,
    content_html: String,
) -> Result<Chapter> {
    let id = Uuid::new_v4().to_string();
    
    // Create chapter node
    let mut result = pool.execute(
        neo4rs::query(
            "MATCH (e:Epub {id: $epub_id})
             CREATE (c:Chapter {
                 id: $id,
                 title: $title,
                 order: $order,
                 content_html: $content_html
             })
             CREATE (e)-[:HAS_CHAPTER]->(c)
             RETURN c"
        )
        .param("epub_id", epub_id)
        .param("id", id.clone())
        .param("title", title.clone())
        .param("order", order)
        .param("content_html", content_html)
    ).await?;
    
    let row = result.next().await?.ok_or("Failed to create chapter")?;
    let node: Node = row.get("c")?;
    node_to_chapter(node, pool).await
}

/// Update chapter
pub async fn update_chapter(
    pool: &Neo4jPool,
    id: String,
    title: Option<String>,
    order: Option<i32>,
    content_html: Option<String>,
) -> Result<Chapter> {
    let mut updates = Vec::new();
    if let Some(t) = &title {
        updates.push(format!("c.title = '{}'", t.replace('\'', "\\'")));
    }
    if let Some(o) = order {
        updates.push(format!("c.order = {}", o));
    }
    if let Some(c) = &content_html {
        updates.push(format!("c.content_html = '{}'", c.replace('\'', "\\'").replace('\n', "\\n")));
    }
    
    if updates.is_empty() {
        return get_chapter(pool, id).await?.ok_or("Chapter not found".into());
    }
    
    let query = format!(
        "MATCH (c:Chapter {{id: $id}}) SET {} RETURN c",
        updates.join(", ")
    );
    
    let mut result = pool.execute(
        neo4rs::query(&query).param("id", id.clone())
    ).await?;
    
    let row = result.next().await?.ok_or("Chapter not found")?;
    let node: Node = row.get("c")?;
    node_to_chapter(node, pool).await
}

/// Delete chapter
pub async fn delete_chapter(pool: &Neo4jPool, id: String) -> Result<bool> {
    let mut result = pool.execute(
        neo4rs::query("MATCH (c:Chapter {id: $id}) DETACH DELETE c RETURN count(c) as deleted")
            .param("id", id)
    ).await?;
    
    if let Some(row) = result.next().await? {
        let deleted: i64 = row.get("deleted")?;
        Ok(deleted > 0)
    } else {
        Ok(false)
    }
}

/// Get media by ID
pub async fn get_media(pool: &Neo4jPool, id: String) -> Result<Option<Media>> {
    let mut result = pool.execute(
        neo4rs::query("MATCH (m:Media {id: $id}) RETURN m")
            .param("id", id.clone())
    ).await?;
    
    if let Some(row) = result.next().await? {
        let node: Node = row.get("m")?;
        let media = node_to_media(node)?;
        Ok(Some(media))
    } else {
        Ok(None)
    }
}

/// Create media
pub async fn create_media(
    pool: &Neo4jPool,
    chapter_id: String,
    r#type: String,
    url: String,
    mime_type: String,
    file_size: i64,
) -> Result<Media> {
    let id = Uuid::new_v4().to_string();
    
    let mut result = pool.execute(
        neo4rs::query(
            "MATCH (c:Chapter {id: $chapter_id})
             CREATE (m:Media {
                 id: $id,
                 type: $type,
                 url: $url,
                 mime_type: $mime_type,
                 file_size: $file_size
             })
             CREATE (c)-[:HAS_MEDIA]->(m)
             RETURN m"
        )
        .param("chapter_id", chapter_id)
        .param("id", id.clone())
        .param("type", r#type.clone())
        .param("url", url.clone())
        .param("mime_type", mime_type.clone())
        .param("file_size", file_size)
    ).await?;
    
    let row = result.next().await?.ok_or("Failed to create media")?;
    let node: Node = row.get("m")?;
    Ok(node_to_media(node)?)
}

/// Get metadata for EPUB
pub async fn get_metadata(pool: &Neo4jPool, epub_id: String) -> Result<Vec<MetadataItem>> {
    let mut result = pool.execute(
        neo4rs::query(
            "MATCH (e:Epub {id: $epub_id})-[:HAS_METADATA]->(m:Metadata)
             RETURN m.key as key, m.value as value"
        )
        .param("epub_id", epub_id)
    ).await?;
    
    let mut metadata = Vec::new();
    while let Some(row) = result.next().await? {
        let key: String = row.get("key")?;
        let value: String = row.get("value")?;
        metadata.push(MetadataItem { key, value });
    }
    Ok(metadata)
}

/// Update metadata
pub async fn update_metadata(
    pool: &Neo4jPool,
    epub_id: String,
    key: String,
    value: String,
) -> Result<MetadataItem> {
    let mut result = pool.execute(
        neo4rs::query(
            "MATCH (e:Epub {id: $epub_id})
             MERGE (m:Metadata {key: $key})
             ON CREATE SET m.value = $value
             ON MATCH SET m.value = $value
             MERGE (e)-[:HAS_METADATA]->(m)
             RETURN m.key as key, m.value as value"
        )
        .param("epub_id", epub_id)
        .param("key", key.clone())
        .param("value", value.clone())
    ).await?;
    
    let row = result.next().await?.ok_or("Failed to update metadata")?;
    Ok(MetadataItem { key, value })
}

// Helper functions to convert Neo4j nodes to GraphQL types

async fn node_to_epub(node: Node, pool: &Neo4jPool) -> Result<Epub> {
    let id: String = node.get("id")?;
    let title: String = node.get("title")?;
    let language: String = node.get("language").unwrap_or_else(|_| "en".to_string());
    let created_at_str: String = node.get("created_at")?;
    let updated_at_str: String = node.get("updated_at")?;
    
    let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
        .map_err(|e| format!("Invalid created_at: {}", e))?
        .with_timezone(&Utc);
    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_at_str)
        .map_err(|e| format!("Invalid updated_at: {}", e))?
        .with_timezone(&Utc);
    
    let chapters = get_chapters(pool, id.clone()).await.unwrap_or_default();
    let metadata = get_metadata(pool, id.clone()).await.unwrap_or_default();
    
    Ok(Epub {
        id: async_graphql::ID::from(id),
        title,
        language,
        created_at,
        updated_at,
        chapters,
        metadata,
    })
}

async fn node_to_chapter(node: Node, pool: &Neo4jPool) -> Result<Chapter> {
    let id: String = node.get("id")?;
    let title: String = node.get("title")?;
    let order: i32 = node.get("order")?;
    let content_html: String = node.get("content_html").unwrap_or_default();
    
    // Get paragraphs (simplified - paragraphs are embedded in content_html for now)
    let paragraphs = Vec::new();
    
    // Get media
    let mut result = pool.execute(
        neo4rs::query(
            "MATCH (c:Chapter {id: $id})-[:HAS_MEDIA]->(m:Media)
             RETURN m"
        )
        .param("id", id.clone())
    ).await?;
    
    let mut media = Vec::new();
    while let Some(row) = result.next().await? {
        let media_node: Node = row.get("m")?;
        if let Ok(m) = node_to_media(media_node) {
            media.push(m);
        }
    }
    
    Ok(Chapter {
        id: async_graphql::ID::from(id),
        title,
        order,
        content_html,
        paragraphs,
        media,
    })
}

fn node_to_media(node: Node) -> Result<Media> {
    let id: String = node.get("id")?;
    let r#type: String = node.get("type")?;
    let url: String = node.get("url")?;
    let mime_type: String = node.get("mime_type")?;
    let file_size: i64 = node.get("file_size")?;
    
    Ok(Media {
        id: async_graphql::ID::from(id),
        r#type,
        url,
        mime_type,
        file_size,
    })
}

