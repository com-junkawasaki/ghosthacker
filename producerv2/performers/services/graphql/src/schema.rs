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

use async_graphql::{Error, InputObject, Object, Result, SimpleObject};
use nanoid::nanoid;
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::terminusdb::{
    client::{get_document, insert_document_typed, update_document_typed, delete_document},
    schema::{
        Chapter as TerminusChapter, EPUBDocument as TerminusEPUBDocument,
        KindleDocument as TerminusKindleDocument, Metadata as TerminusMetadata,
        Paragraph as TerminusParagraph, Project as TerminusProject, Script as TerminusScript,
        Section as TerminusSection, Story as TerminusStory,
        TextNode as TerminusTextNode,
    },
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
        match get_document(&id).await {
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
        match get_document(&id).await {
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

    /// EPUBドキュメントを取得
    /// 
    /// @context {
    ///   "@id": "ex:getEPUBDocument",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:DocumentId",
    ///   "ex:produces": "ex:EPUBDocument"
    /// }
    async fn epub_document(&self, id: String) -> Result<Option<EPUBDocument>> {
        match get_document(&id).await {
            Ok(doc) => {
                match serde_json::from_value::<TerminusEPUBDocument>(doc) {
                    Ok(epub) => Ok(Some(epub.into())),
                    Err(e) => {
                        error!("Failed to parse EPUB document {}: {}", id, e);
                        Ok(None)
                    }
                }
            }
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
        match get_document(&id).await {
            Ok(doc) => {
                match serde_json::from_value::<TerminusKindleDocument>(doc) {
                    Ok(kindle) => Ok(Some(kindle.into())),
                    Err(e) => {
                        error!("Failed to parse Kindle document {}: {}", id, e);
                        Ok(None)
                    }
                }
            }
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
    async fn chapters(&self, _document_id: String) -> Result<Vec<Chapter>> {
        // 簡易実装: 実際のWOQLクエリが必要
        // 現時点では空のリストを返す
        Ok(vec![])
    }

    /// テキストノードを取得
    /// 
    /// @context {
    ///   "@id": "ex:getTextNodes",
    ///   "@type": "ex:Activity",
    ///   "ex:consumes": "ex:ParagraphId",
    ///   "ex:produces": "ex:TextNodeList"
    /// }
    async fn text_nodes(&self, _paragraph_id: String) -> Result<Vec<TextNode>> {
        // 簡易実装: 実際のWOQLクエリが必要
        // 現時点では空のリストを返す
        Ok(vec![])
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
        match get_document(&id).await {
            Ok(doc) => {
                match serde_json::from_value::<TerminusProject>(doc) {
                    Ok(project) => Ok(Some(project.into())),
                    Err(e) => {
                        error!("Failed to parse project {}: {}", id, e);
                        Ok(None)
                    }
                }
            }
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
        // 簡易実装: 実際のWOQLクエリが必要
        // 現時点では空のリストを返す
        Ok(vec![])
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

        match insert_document_typed(&story).await {
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
        let doc = get_document(&id).await
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

        match update_document_typed(&story).await {
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
        

        match delete_document(&id).await {
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
        match insert_document_typed(&script).await {
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
        let doc = get_document(&id).await
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

        match update_document_typed(&script).await {
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
        

        match delete_document(&id).await {
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
        

        let now = chrono::Utc::now().to_rfc3339();
        let doc_id = format!("EPUBDocument_{}", nanoid!());

        let mut epub = TerminusEPUBDocument {
            id: doc_id.clone(),
            r#type: "ex:EPUBDocument".to_string(),
            title: title.clone(),
            metadata: None,
            chapters: None,
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };

        // メタデータを作成
        if let Some(meta_input) = metadata {
            let meta_id = format!("Metadata_{}", nanoid!());
            let meta = TerminusMetadata {
                id: meta_id.clone(),
                r#type: "ex:Metadata".to_string(),
                title: meta_input.title,
                isbn: meta_input.isbn,
                language: meta_input.language,
                publisher: meta_input.publisher,
                date: meta_input.date,
                description: meta_input.description,
                created_at: Some(now.clone()),
                updated_at: Some(now.clone()),
            };
            epub.metadata = Some(meta_id.clone());

            // メタデータを保存
            insert_document_typed(&meta).await
                .map_err(|e| Error::new(format!("Failed to create metadata: {}", e)))?;
        }

        match insert_document_typed(&epub).await {
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
        

        let doc = get_document(&id).await
            .map_err(|e| Error::new(format!("EPUB document not found: {}", e)))?;
        let mut epub: TerminusEPUBDocument = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse EPUB document: {}", e)))?;

        if let Some(t) = title {
            epub.title = t;
        }
        epub.updated_at = Some(chrono::Utc::now().to_rfc3339());

        match update_document_typed(&epub).await {
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
        _document_id: String,
        title: String,
        order: i32,
    ) -> Result<Chapter> {
        

        let now = chrono::Utc::now().to_rfc3339();
        let chapter_id = format!("Chapter_{}", nanoid!());

        let chapter = TerminusChapter {
            id: chapter_id.clone(),
            r#type: "ex:Chapter".to_string(),
            title: title.clone(),
            order,
            sections: None,
            paragraphs: None,
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };
        match insert_document_typed(&chapter).await {
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
        

        let doc = get_document(&id).await
            .map_err(|e| Error::new(format!("Chapter not found: {}", e)))?;
        let mut chapter: TerminusChapter = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse chapter: {}", e)))?;

        if let Some(t) = title {
            chapter.title = t;
        }
        if let Some(o) = order {
            chapter.order = o;
        }
        chapter.updated_at = Some(chrono::Utc::now().to_rfc3339());

        match update_document_typed(&chapter).await {
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
        _chapter_id: String,
        order: i32,
    ) -> Result<Paragraph> {
        

        let now = chrono::Utc::now().to_rfc3339();
        let paragraph_id = format!("Paragraph_{}", nanoid!());

        let paragraph = TerminusParagraph {
            id: paragraph_id.clone(),
            r#type: "ex:Paragraph".to_string(),
            order,
            text_nodes: None,
            style: None,
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };
        match insert_document_typed(&paragraph).await {
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
        

        let doc = get_document(&id).await
            .map_err(|e| Error::new(format!("Paragraph not found: {}", e)))?;
        let mut paragraph: TerminusParagraph = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse paragraph: {}", e)))?;

        if let Some(o) = order {
            paragraph.order = o;
        }
        paragraph.updated_at = Some(chrono::Utc::now().to_rfc3339());

        match update_document_typed(&paragraph).await {
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
        

        let now = chrono::Utc::now().to_rfc3339();
        let text_node_id = format!("TextNode_{}", nanoid!());

        let text_node = TerminusTextNode {
            id: text_node_id.clone(),
            r#type: "ex:TextNode".to_string(),
            content: content.clone(),
            order,
            belongs_to_paragraph: paragraph_id.clone(),
            style: None,
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };
        match insert_document_typed(&text_node).await {
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
        

        let doc = get_document(&id).await
            .map_err(|e| Error::new(format!("Text node not found: {}", e)))?;
        let mut text_node: TerminusTextNode = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse text node: {}", e)))?;

        if let Some(c) = content {
            text_node.content = c;
        }
        if let Some(o) = order {
            text_node.order = o;
        }
        text_node.updated_at = Some(chrono::Utc::now().to_rfc3339());

        match update_document_typed(&text_node).await {
            Ok(_) => Ok(text_node.into()),
            Err(e) => {
                error!("Failed to update text node: {}", e);
                Err(Error::new(format!("Failed to update text node: {}", e)))
            }
        }
    }

    /// テキストノードを削除
    async fn delete_text_node(&self, id: String) -> Result<bool> {
        

        match delete_document(&id).await {
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
        use crate::terminusdb::client::insert_document_typed;

        let now = chrono::Utc::now().to_rfc3339();
        let project_id = format!("Project_{}", nanoid!());

        let project = TerminusProject {
            id: project_id.clone(),
            r#type: "terminusdb:///schema#Project".to_string(),
            name: name.clone(),
            author: Some("system".to_string()),
            description,
            status: Some("active".to_string()),
            created_at: Some(now.clone()),
            updated_at: Some(now.clone()),
        };

        match insert_document_typed(&project).await {
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
        let doc = get_document(&id).await
            .map_err(|e| Error::new(format!("Project not found: {}", e)))?;
        let mut project: TerminusProject = serde_json::from_value(doc)
            .map_err(|e| Error::new(format!("Failed to parse project: {}", e)))?;

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
                project.updated_at = Some(chrono::Utc::now().to_rfc3339());

        
        match update_document_typed(&doc).await {
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
        

        match delete_document(&id).await {
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

impl From<TerminusEPUBDocument> for EPUBDocument {
    fn from(epub: TerminusEPUBDocument) -> Self {
        EPUBDocument {
            id: epub.id,
            title: epub.title,
            metadata: epub.metadata,
            chapters: epub.chapters,
            created_at: epub.created_at.unwrap_or_default(),
            updated_at: epub.updated_at.unwrap_or_default(),
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

impl From<TerminusKindleDocument> for KindleDocument {
    fn from(kindle: TerminusKindleDocument) -> Self {
        KindleDocument {
            id: kindle.id,
            title: kindle.title,
            metadata: kindle.metadata,
            chapters: kindle.chapters,
            created_at: kindle.created_at.unwrap_or_default(),
            updated_at: kindle.updated_at.unwrap_or_default(),
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

impl From<TerminusChapter> for Chapter {
    fn from(chapter: TerminusChapter) -> Self {
        Chapter {
            id: chapter.id,
            title: chapter.title,
            order: chapter.order,
            sections: chapter.sections,
            paragraphs: chapter.paragraphs,
            created_at: chapter.created_at.unwrap_or_default(),
            updated_at: chapter.updated_at.unwrap_or_default(),
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

impl From<TerminusSection> for Section {
    fn from(section: TerminusSection) -> Self {
        Section {
            id: section.id,
            title: section.title,
            order: section.order,
            paragraphs: section.paragraphs,
            created_at: section.created_at.unwrap_or_default(),
            updated_at: section.updated_at.unwrap_or_default(),
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

impl From<TerminusParagraph> for Paragraph {
    fn from(paragraph: TerminusParagraph) -> Self {
        Paragraph {
            id: paragraph.id,
            order: paragraph.order,
            text_nodes: paragraph.text_nodes,
            style: paragraph.style,
            created_at: paragraph.created_at.unwrap_or_default(),
            updated_at: paragraph.updated_at.unwrap_or_default(),
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

impl From<TerminusTextNode> for TextNode {
    fn from(text_node: TerminusTextNode) -> Self {
        TextNode {
            id: text_node.id,
            content: text_node.content,
            order: text_node.order,
            belongs_to_paragraph: text_node.belongs_to_paragraph,
            style: text_node.style,
            created_at: text_node.created_at.unwrap_or_default(),
            updated_at: text_node.updated_at.unwrap_or_default(),
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

impl From<TerminusProject> for Project {
    fn from(project: TerminusProject) -> Self {
        Project {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            created_at: project.created_at.unwrap_or_default(),
            updated_at: project.updated_at.unwrap_or_default(),
        }
    }
}

