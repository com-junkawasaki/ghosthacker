/**
 * GraphQL Schema定義
 * PostgreSQL + SQLx を使用した GraphQL スキーマ
 * 
 * @context {
 *   "@id": "ex:GraphQLSchema",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphQLSchema"
 * }
 */

use async_graphql::{Error, InputObject, Object, Result, SimpleObject};
use nanoid::nanoid;
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::database::{
    get_project, get_all_projects, create_project, update_project, delete_project,
    get_story, get_all_stories, create_story, update_story, delete_story,
    get_script, get_all_scripts, create_script, update_script, delete_script,
    get_epub_document, create_epub_document, update_epub_document,
    get_kindle_document, create_kindle_document, update_kindle_document,
    get_metadata, create_metadata, update_metadata,
    get_chapter, get_chapters_by_document, create_chapter, update_chapter,
    get_section, get_sections_by_chapter, create_section, update_section,
    get_paragraph, get_paragraphs_by_parent, create_paragraph, update_paragraph,
    get_text_node, get_text_nodes_by_paragraph, create_text_node, update_text_node, delete_text_node,
    Chapter as DatabaseChapter, EPUBDocument as DatabaseEPUBDocument,
    KindleDocument as DatabaseKindleDocument, Metadata as DatabaseMetadata,
    Paragraph as DatabaseParagraph, Project as DatabaseProject, Script as DatabaseScript,
    Section as DatabaseSection, Story as DatabaseStory,
    TextNode as DatabaseTextNode,
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
        match get_story(&id).await {
            Ok(Some(story)) => Ok(Some(story.into())),
            Ok(None) => Ok(None),
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
        match get_all_stories().await {
            Ok(stories) => Ok(stories.into_iter().map(|s| s.into()).collect()),
            Err(e) => {
                error!("Failed to get stories: {}", e);
                Ok(vec![])
            }
        }
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
        match get_script(&id).await {
            Ok(Some(script)) => Ok(Some(script.into())),
            Ok(None) => Ok(None),
            Err(e) => {
                error!("Failed to get script {}: {}", id, e);
                Ok(None)
            }
        }
    }

    /// EPUBドキュメントを取得
    /// 
    /// @context {
    ///   "@id": "ex:getEPUBDocument",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:DocumentId",
    ///   "ex:produces": "ex:EPUBDocument"
    /// }
    async fn epub_document(&self, id: String) -> Result<Option<EPUBDocument>> {
        match get_epub_document(&id).await {
            Ok(Some(epub)) => Ok(Some(epub.into())),
            Ok(None) => Ok(None),
            Err(e) => {
                error!("Failed to get EPUB document {}: {}", id, e);
                Ok(None)
            }
        }
    }

    /// Kindleドキュメントを取得
    /// 
    /// @context {
    ///   "@id": "ex:getKindleDocument",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:DocumentId",
    ///   "ex:produces": "ex:KindleDocument"
    /// }
    async fn kindle_document(&self, id: String) -> Result<Option<KindleDocument>> {
        match get_kindle_document(&id).await {
            Ok(Some(kindle)) => Ok(Some(kindle.into())),
            Ok(None) => Ok(None),
            Err(e) => {
                error!("Failed to get Kindle document {}: {}", id, e);
                Ok(None)
            }
        }
    }

    /// 章を取得
    /// 
    /// @context {
    ///   "@id": "ex:getChapters",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:DocumentId",
    ///   "ex:produces": "ex:ChapterList"
    /// }
    async fn chapters(&self, document_id: String, is_epub: Option<bool>) -> Result<Vec<Chapter>> {
        let is_epub = is_epub.unwrap_or(true);
        match get_chapters_by_document(&document_id, is_epub).await {
            Ok(chapters) => Ok(chapters.into_iter().map(|c| c.into()).collect()),
            Err(e) => {
                error!("Failed to get chapters for document {}: {}", document_id, e);
                Ok(vec![])
            }
        }
    }

    /// テキストノードを取得
    /// 
    /// @context {
    ///   "@id": "ex:getTextNodes",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ParagraphId",
    ///   "ex:produces": "ex:TextNodeList"
    /// }
    async fn text_nodes(&self, paragraph_id: String) -> Result<Vec<TextNode>> {
        match get_text_nodes_by_paragraph(&paragraph_id).await {
            Ok(text_nodes) => Ok(text_nodes.into_iter().map(|tn| tn.into()).collect()),
            Err(e) => {
                error!("Failed to get text nodes for paragraph {}: {}", paragraph_id, e);
                Ok(vec![])
            }
        }
    }

    /// プロジェクトを取得
    /// 
    /// @context {
    ///   "@id": "ex:getProject",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ProjectId",
    ///   "ex:produces": "ex:Project"
    /// }
    async fn project(&self, id: String) -> Result<Option<Project>> {
        match get_project(&id).await {
            Ok(Some(project)) => Ok(Some(project.into())),
            Ok(None) => Ok(None),
            Err(e) => {
                error!("Failed to get project {}: {}", id, e);
                Ok(None)
            }
        }
    }

    /// すべてのプロジェクトを取得
    /// 
    /// @context {
    ///   "@id": "ex:getAllProjects",
    ///   "@type": "ex:Activity",
    ///   "ex:produces": "ex:ProjectList"
    /// }
    async fn projects(&self) -> Result<Vec<Project>> {
        match get_all_projects().await {
            Ok(projects) => Ok(projects.into_iter().map(|p| p.into()).collect()),
            Err(e) => {
                error!("Failed to get projects: {}", e);
                Ok(vec![])
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
        let now = chrono::Utc::now();
        let story_id = format!("Story_{}", nanoid!());

        let story = DatabaseStory {
            id: story_id.clone(),
            title: title.clone(),
            content: content.clone(),
            created_at: now,
            updated_at: now,
        };

        match create_story(&story).await {
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
        // 既存のStoryを取得
        let mut story = get_story(&id).await
            .map_err(|e| Error::new(format!("Story not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("Story not found: {}", id)))?;

        // 更新フィールドを適用
        if let Some(t) = title {
            story.title = t;
        }
        if let Some(c) = content {
            story.content = c;
        }
        story.updated_at = chrono::Utc::now();

        match update_story(&story).await {
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
        match delete_story(&id).await {
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
        let now = chrono::Utc::now();
        let script_id = format!("Script_{}", nanoid!());

        let script = DatabaseScript {
            id: script_id.clone(),
            script_text: script_text.clone(),
            derived_from_story: derived_from_story.clone(),
            status: status.clone(),
            created_at: now,
            updated_at: now,
        };

        match create_script(&script).await {
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
        // 既存のScriptを取得
        let mut script = get_script(&id).await
            .map_err(|e| Error::new(format!("Script not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("Script not found: {}", id)))?;

        // 更新フィールドを適用
        if let Some(st) = script_text {
            script.script_text = st;
        }
        if let Some(s) = status {
            script.status = s;
        }
        script.updated_at = chrono::Utc::now();

        match update_script(&script).await {
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
        match delete_script(&id).await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Failed to delete script: {}", e);
                Err(Error::new(format!("Failed to delete script: {}", e)))
            }
        }
    }

    /// EPUBドキュメントを作成
    /// 
    /// @context {
    ///   "@id": "ex:createEPUBDocument",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:EPUBDocumentInput",
    ///   "ex:produces": "ex:EPUBDocument"
    /// }
    async fn create_epub_document(
        &self,
        title: String,
        metadata: Option<MetadataInput>,
    ) -> Result<EPUBDocument> {
        let now = chrono::Utc::now();
        let doc_id = format!("EPUBDocument_{}", nanoid!());

        let mut metadata_id = None;

        // メタデータを作成
        if let Some(meta_input) = metadata {
            let meta_id = format!("Metadata_{}", nanoid!());
            let meta = DatabaseMetadata {
                id: meta_id.clone(),
                title: meta_input.title,
                isbn: meta_input.isbn,
                language: meta_input.language,
                publisher: meta_input.publisher,
                date: meta_input.date,
                description: meta_input.description,
                created_at: now,
                updated_at: now,
            };
            metadata_id = Some(meta_id.clone());

            // メタデータを保存
            create_metadata(&meta).await
                .map_err(|e| Error::new(format!("Failed to create metadata: {}", e)))?;
        }

        let epub = DatabaseEPUBDocument {
            id: doc_id.clone(),
            title: title.clone(),
            metadata_id: metadata_id.clone(),
            created_at: now,
            updated_at: now,
        };

        match create_epub_document(&epub).await {
            Ok(_) => Ok(epub.into()),
            Err(e) => {
                error!("Failed to create EPUB document: {}", e);
                Err(Error::new(format!("Failed to create EPUB document: {}", e)))
            }
        }
    }

    /// EPUBドキュメントを更新
    async fn update_epub_document(
        &self,
        id: String,
        title: Option<String>,
        _metadata: Option<MetadataInput>,
    ) -> Result<EPUBDocument> {
        let mut epub = get_epub_document(&id).await
            .map_err(|e| Error::new(format!("EPUB document not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("EPUB document not found: {}", id)))?;

        if let Some(t) = title {
            epub.title = t;
        }
        epub.updated_at = chrono::Utc::now();

        match update_epub_document(&epub).await {
            Ok(_) => Ok(epub.into()),
            Err(e) => {
                error!("Failed to update EPUB document: {}", e);
                Err(Error::new(format!("Failed to update EPUB document: {}", e)))
            }
        }
    }

    /// 章を作成
    async fn create_chapter(
        &self,
        document_id: String,
        is_epub: Option<bool>,
        title: String,
        order: i32,
    ) -> Result<Chapter> {
        let now = chrono::Utc::now();
        let chapter_id = format!("Chapter_{}", nanoid!());
        let is_epub = is_epub.unwrap_or(true);

        let chapter = DatabaseChapter {
            id: chapter_id.clone(),
            epub_document_id: if is_epub { Some(document_id.clone()) } else { None },
            kindle_document_id: if !is_epub { Some(document_id.clone()) } else { None },
            title: title.clone(),
            order,
            created_at: now,
            updated_at: now,
        };
        match create_chapter(&chapter).await {
            Ok(_) => Ok(chapter.into()),
            Err(e) => {
                error!("Failed to create chapter: {}", e);
                Err(Error::new(format!("Failed to create chapter: {}", e)))
            }
        }
    }

    /// 章を更新
    async fn update_chapter(
        &self,
        id: String,
        title: Option<String>,
        order: Option<i32>,
    ) -> Result<Chapter> {
        let mut chapter = get_chapter(&id).await
            .map_err(|e| Error::new(format!("Chapter not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("Chapter not found: {}", id)))?;

        if let Some(t) = title {
            chapter.title = t;
        }
        if let Some(o) = order {
            chapter.order = o;
        }
        chapter.updated_at = chrono::Utc::now();

        match update_chapter(&chapter).await {
            Ok(_) => Ok(chapter.into()),
            Err(e) => {
                error!("Failed to update chapter: {}", e);
                Err(Error::new(format!("Failed to update chapter: {}", e)))
            }
        }
    }

    /// 段落を作成
    async fn create_paragraph(
        &self,
        chapter_id: Option<String>,
        section_id: Option<String>,
        order: i32,
    ) -> Result<Paragraph> {
        let now = chrono::Utc::now();
        let paragraph_id = format!("Paragraph_{}", nanoid!());

        let paragraph = DatabaseParagraph {
            id: paragraph_id.clone(),
            chapter_id,
            section_id,
            order,
            style: None,
            created_at: now,
            updated_at: now,
        };
        match create_paragraph(&paragraph).await {
            Ok(_) => Ok(paragraph.into()),
            Err(e) => {
                error!("Failed to create paragraph: {}", e);
                Err(Error::new(format!("Failed to create paragraph: {}", e)))
            }
        }
    }

    /// 段落を更新
    async fn update_paragraph(
        &self,
        id: String,
        order: Option<i32>,
    ) -> Result<Paragraph> {
        let mut paragraph = get_paragraph(&id).await
            .map_err(|e| Error::new(format!("Paragraph not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("Paragraph not found: {}", id)))?;

        if let Some(o) = order {
            paragraph.order = o;
        }
        paragraph.updated_at = chrono::Utc::now();

        match update_paragraph(&paragraph).await {
            Ok(_) => Ok(paragraph.into()),
            Err(e) => {
                error!("Failed to update paragraph: {}", e);
                Err(Error::new(format!("Failed to update paragraph: {}", e)))
            }
        }
    }

    /// テキストノードを作成
    async fn create_text_node(
        &self,
        paragraph_id: String,
        content: String,
        order: i32,
    ) -> Result<TextNode> {
        let now = chrono::Utc::now();
        let text_node_id = format!("TextNode_{}", nanoid!());

        let text_node = DatabaseTextNode {
            id: text_node_id.clone(),
            paragraph_id: paragraph_id.clone(),
            content: content.clone(),
            order,
            style: None,
            created_at: now,
            updated_at: now,
        };
        match create_text_node(&text_node).await {
            Ok(_) => Ok(text_node.into()),
            Err(e) => {
                error!("Failed to create text node: {}", e);
                Err(Error::new(format!("Failed to create text node: {}", e)))
            }
        }
    }

    /// テキストノードを更新
    async fn update_text_node(
        &self,
        id: String,
        content: Option<String>,
        order: Option<i32>,
    ) -> Result<TextNode> {
        let mut text_node = get_text_node(&id).await
            .map_err(|e| Error::new(format!("Text node not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("Text node not found: {}", id)))?;

        if let Some(c) = content {
            text_node.content = c;
        }
        if let Some(o) = order {
            text_node.order = o;
        }
        text_node.updated_at = chrono::Utc::now();

        match update_text_node(&text_node).await {
            Ok(_) => Ok(text_node.into()),
            Err(e) => {
                error!("Failed to update text node: {}", e);
                Err(Error::new(format!("Failed to update text node: {}", e)))
            }
        }
    }

    /// テキストノードを削除
    async fn delete_text_node(&self, id: String) -> Result<bool> {
        match delete_text_node(&id).await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Failed to delete text node: {}", e);
                Err(Error::new(format!("Failed to delete text node: {}", e)))
            }
        }
    }

            /// プロジェクトを作成
            ///
            /// @context {
            ///   "@id": "ex:createProject",
            ///   "@type": "ex:Activity",
            ///   "ex:consumes": "ex:ProjectInput",
            ///   "ex:produces": "ex:Project"
            /// }
    async fn create_project(&self, name: String, description: Option<String>) -> Result<Project> {
        let now = chrono::Utc::now();
        let project_id = format!("Project_{}", nanoid!());

        let project = DatabaseProject {
            id: project_id.clone(),
            name: name.clone(),
            author: Some("system".to_string()),
            description,
            status: Some("active".to_string()),
            created_at: now,
            updated_at: now,
        };

        match create_project(&project).await {
            Ok(_) => Ok(project.into()),
            Err(e) => {
                error!("Failed to create project: {}", e);
                Err(Error::new(format!("Failed to create project: {}", e)))
            }
        }
    }

    /// プロジェクトを更新
    /// 
    /// @context {
    ///   "@id": "ex:updateProject",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": ["ex:ProjectId", "ex:ProjectUpdate"],
    ///   "ex:produces": "ex:Project"
    /// }
    async fn update_project(
        &self,
        id: String,
        name: Option<String>,
        description: Option<String>,
        status: Option<String>,
    ) -> Result<Project> {
        // 既存のプロジェクトを取得
        let mut project = get_project(&id).await
            .map_err(|e| Error::new(format!("Project not found: {}", e)))?
            .ok_or_else(|| Error::new(format!("Project not found: {}", id)))?;

        // 更新フィールドを適用
        if let Some(n) = name {
            project.name = n;
        }
        if let Some(d) = description {
            project.description = Some(d);
        }
        if let Some(s) = status {
            project.status = Some(s);
        }
        project.updated_at = chrono::Utc::now();

        match update_project(&project).await {
            Ok(_) => Ok(project.into()),
            Err(e) => {
                error!("Failed to update project: {}", e);
                Err(Error::new(format!("Failed to update project: {}", e)))
            }
        }
    }

    /// プロジェクトを削除
    /// 
    /// @context {
    ///   "@id": "ex:deleteProject",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ProjectId",
    ///   "ex:produces": "ex:Deleted"
    /// }
    async fn delete_project(&self, id: String) -> Result<bool> {
        match delete_project(&id).await {
            Ok(_) => Ok(true),
            Err(e) => {
                error!("Failed to delete project: {}", e);
                Err(Error::new(format!("Failed to delete project: {}", e)))
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

impl From<DatabaseStory> for Story {
    fn from(story: DatabaseStory) -> Self {
        Story {
            id: story.id,
            title: story.title,
            content: story.content,
            created_at: story.created_at.to_rfc3339(),
            updated_at: story.updated_at.to_rfc3339(),
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

impl From<DatabaseScript> for Script {
    fn from(script: DatabaseScript) -> Self {
        Script {
            id: script.id,
            script_text: script.script_text,
            derived_from_story: script.derived_from_story,
            status: script.status,
            created_at: script.created_at.to_rfc3339(),
            updated_at: script.updated_at.to_rfc3339(),
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

// EPUB/Kindle GraphQL型定義

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct EPUBDocument {
    pub id: String,
    pub title: String,
    pub metadata: Option<String>,
    pub chapters: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseEPUBDocument> for EPUBDocument {
    fn from(epub: DatabaseEPUBDocument) -> Self {
        EPUBDocument {
            id: epub.id,
            title: epub.title,
            metadata: epub.metadata_id,
            chapters: None, // TODO: 必要に応じてchaptersを取得
            created_at: epub.created_at.to_rfc3339(),
            updated_at: epub.updated_at.to_rfc3339(),
        }
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct KindleDocument {
    pub id: String,
    pub title: String,
    pub metadata: Option<String>,
    pub chapters: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseKindleDocument> for KindleDocument {
    fn from(kindle: DatabaseKindleDocument) -> Self {
        KindleDocument {
            id: kindle.id,
            title: kindle.title,
            metadata: kindle.metadata_id,
            chapters: None, // TODO: 必要に応じてchaptersを取得
            created_at: kindle.created_at.to_rfc3339(),
            updated_at: kindle.updated_at.to_rfc3339(),
        }
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub order: i32,
    pub sections: Option<Vec<String>>,
    pub paragraphs: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseChapter> for Chapter {
    fn from(chapter: DatabaseChapter) -> Self {
        Chapter {
            id: chapter.id,
            title: chapter.title,
            order: chapter.order,
            sections: None, // TODO: 必要に応じてsectionsを取得
            paragraphs: None, // TODO: 必要に応じてparagraphsを取得
            created_at: chapter.created_at.to_rfc3339(),
            updated_at: chapter.updated_at.to_rfc3339(),
        }
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Section {
    pub id: String,
    pub title: String,
    pub order: i32,
    pub paragraphs: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseSection> for Section {
    fn from(section: DatabaseSection) -> Self {
        Section {
            id: section.id,
            title: section.title,
            order: section.order,
            paragraphs: None, // TODO: 必要に応じてparagraphsを取得
            created_at: section.created_at.to_rfc3339(),
            updated_at: section.updated_at.to_rfc3339(),
        }
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Paragraph {
    pub id: String,
    pub order: i32,
    pub text_nodes: Option<Vec<String>>,
    pub style: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseParagraph> for Paragraph {
    fn from(paragraph: DatabaseParagraph) -> Self {
        Paragraph {
            id: paragraph.id,
            order: paragraph.order,
            text_nodes: None, // TODO: 必要に応じてtext_nodesを取得
            style: paragraph.style,
            created_at: paragraph.created_at.to_rfc3339(),
            updated_at: paragraph.updated_at.to_rfc3339(),
        }
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct TextNode {
    pub id: String,
    pub content: String,
    pub order: i32,
    pub belongs_to_paragraph: String,
    pub style: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseTextNode> for TextNode {
    fn from(text_node: DatabaseTextNode) -> Self {
        TextNode {
            id: text_node.id,
            content: text_node.content,
            order: text_node.order,
            belongs_to_paragraph: text_node.paragraph_id,
            style: text_node.style,
            created_at: text_node.created_at.to_rfc3339(),
            updated_at: text_node.updated_at.to_rfc3339(),
        }
    }
}

#[derive(SimpleObject, Serialize, Deserialize, Clone, InputObject)]
#[graphql(input_name = "MetadataInput")]
pub struct MetadataInput {
    pub title: Option<String>,
    pub isbn: Option<String>,
    pub language: Option<String>,
    pub publisher: Option<String>,
    pub date: Option<String>,
    pub description: Option<String>,
}

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DatabaseProject> for Project {
    fn from(project: DatabaseProject) -> Self {
        Project {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            created_at: project.created_at.to_rfc3339(),
            updated_at: project.updated_at.to_rfc3339(),
        }
    }
}

