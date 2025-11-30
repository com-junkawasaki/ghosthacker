use tonic::{Request, Response, Status};
use prost_types::Timestamp;
use chrono::{DateTime, Utc};
use nanoid::nanoid;
use serde_json::Value as JsonValue;

use crate::database::client::{
    get_epub_document, create_epub_document, update_epub_document,
    get_kindle_document, create_kindle_document,
    get_chapter, get_chapters_by_document, create_chapter, update_chapter,
    get_paragraph, get_paragraphs_by_parent, get_paragraphs_by_epub_document, create_paragraph, update_paragraph,
    get_text_node, get_text_nodes_by_paragraph, create_text_node, update_text_node, delete_text_node,
};
use crate::database::schema::{
    EPUBDocument as DatabaseEPUBDocument,
    KindleDocument as DatabaseKindleDocument,
    Chapter as DatabaseChapter,
    Paragraph as DatabaseParagraph,
    TextNode as DatabaseTextNode,
};

pub mod proto {
    pub mod common {
        tonic::include_proto!("common");
    }
    tonic::include_proto!("producer");
}

use proto::{
    document_service_server::DocumentService,
    GetEpubDocumentRequest, GetEpubDocumentResponse,
    CreateEpubDocumentRequest, CreateEpubDocumentResponse,
    UpdateEpubDocumentRequest, UpdateEpubDocumentResponse,
    GetKindleDocumentRequest, GetKindleDocumentResponse,
    GetChaptersRequest, GetChaptersResponse,
    CreateChapterRequest, CreateChapterResponse,
    UpdateChapterRequest, UpdateChapterResponse,
    GetParagraphsRequest, GetParagraphsResponse,
    CreateParagraphRequest, CreateParagraphResponse,
    UpdateParagraphRequest, UpdateParagraphResponse,
    GetTextNodesRequest, GetTextNodesResponse,
    CreateTextNodeRequest, CreateTextNodeResponse,
    UpdateTextNodeRequest, UpdateTextNodeResponse,
    DeleteTextNodeRequest, DeleteTextNodeResponse,
    EpubDocument, KindleDocument, Chapter, Paragraph, TextNode,
};

fn chrono_to_prost(dt: DateTime<Utc>) -> Timestamp {
    Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

fn database_to_proto_epub(db: DatabaseEPUBDocument) -> EpubDocument {
    EpubDocument {
        id: db.id,
        title: db.title,
        metadata_id: db.metadata_id,
        tiptap_content: db.tiptap_content.map(|v| serde_json::to_string(&v).unwrap_or_default()),
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

fn database_to_proto_kindle(db: DatabaseKindleDocument) -> KindleDocument {
    KindleDocument {
        id: db.id,
        title: db.title,
        metadata_id: db.metadata_id,
        tiptap_content: db.tiptap_content.map(|v| serde_json::to_string(&v).unwrap_or_default()),
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

fn database_to_proto_chapter(db: DatabaseChapter) -> Chapter {
    Chapter {
        id: db.id,
        epub_document_id: db.epub_document_id,
        kindle_document_id: db.kindle_document_id,
        title: db.title,
        order: db.order,
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

fn database_to_proto_paragraph(db: DatabaseParagraph) -> Paragraph {
    Paragraph {
        id: db.id,
        chapter_id: db.chapter_id,
        section_id: db.section_id,
        order: db.order,
        style: db.style,
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

fn database_to_proto_text_node(db: DatabaseTextNode) -> TextNode {
    TextNode {
        id: db.id,
        paragraph_id: db.paragraph_id,
        content: db.content,
        order: db.order,
        style: db.style,
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

#[derive(Default)]
pub struct DocumentServiceImpl;

#[tonic::async_trait]
impl DocumentService for DocumentServiceImpl {
    async fn get_epub_document(
        &self,
        request: Request<GetEpubDocumentRequest>,
    ) -> Result<Response<GetEpubDocumentResponse>, Status> {
        let req = request.into_inner();
        match get_epub_document(&req.id).await {
            Ok(Some(doc)) => Ok(Response::new(GetEpubDocumentResponse {
                document: Some(database_to_proto_epub(doc)),
            })),
            Ok(None) => Ok(Response::new(GetEpubDocumentResponse { document: None })),
            Err(e) => Err(Status::internal(format!("Failed to get EPUB document: {}", e))),
        }
    }

    async fn create_epub_document(
        &self,
        request: Request<CreateEpubDocumentRequest>,
    ) -> Result<Response<CreateEpubDocumentResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let doc_id = format!("EPUB_{}", nanoid!());

        let tiptap_content = req.tiptap_content
            .and_then(|s| serde_json::from_str::<JsonValue>(&s).ok());

        let doc = DatabaseEPUBDocument {
            id: doc_id.clone(),
            title: req.title,
            metadata_id: req.metadata_id,
            tiptap_content,
            created_at: now,
            updated_at: now,
        };

        match create_epub_document(&doc).await {
            Ok(_) => Ok(Response::new(CreateEpubDocumentResponse {
                document: Some(database_to_proto_epub(doc)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create EPUB document: {}", e))),
        }
    }

    async fn update_epub_document(
        &self,
        request: Request<UpdateEpubDocumentRequest>,
    ) -> Result<Response<UpdateEpubDocumentResponse>, Status> {
        let req = request.into_inner();
        let mut doc = get_epub_document(&req.id).await
            .map_err(|e| Status::not_found(format!("EPUB document not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("EPUB document not found: {}", req.id)))?;

        if let Some(title) = req.title {
            doc.title = title;
        }
        if let Some(metadata_id) = req.metadata_id {
            doc.metadata_id = Some(metadata_id);
        }
        if let Some(tiptap_content_str) = req.tiptap_content {
            doc.tiptap_content = serde_json::from_str::<JsonValue>(&tiptap_content_str).ok();
        }
        doc.updated_at = Utc::now();

        match update_epub_document(&doc).await {
            Ok(_) => Ok(Response::new(UpdateEpubDocumentResponse {
                document: Some(database_to_proto_epub(doc)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update EPUB document: {}", e))),
        }
    }

    async fn get_kindle_document(
        &self,
        request: Request<GetKindleDocumentRequest>,
    ) -> Result<Response<GetKindleDocumentResponse>, Status> {
        let req = request.into_inner();
        match get_kindle_document(&req.id).await {
            Ok(Some(doc)) => Ok(Response::new(GetKindleDocumentResponse {
                document: Some(database_to_proto_kindle(doc)),
            })),
            Ok(None) => Ok(Response::new(GetKindleDocumentResponse { document: None })),
            Err(e) => Err(Status::internal(format!("Failed to get Kindle document: {}", e))),
        }
    }

    async fn get_chapters(
        &self,
        request: Request<GetChaptersRequest>,
    ) -> Result<Response<GetChaptersResponse>, Status> {
        let req = request.into_inner();
        match get_chapters_by_document(&req.document_id, req.is_epub).await {
            Ok(chapters) => {
                let proto_chapters: Vec<Chapter> = chapters
                    .into_iter()
                    .map(database_to_proto_chapter)
                    .collect();
                Ok(Response::new(GetChaptersResponse {
                    chapters: proto_chapters,
                }))
            }
            Err(e) => Err(Status::internal(format!("Failed to get chapters: {}", e))),
        }
    }

    async fn create_chapter(
        &self,
        request: Request<CreateChapterRequest>,
    ) -> Result<Response<CreateChapterResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let chapter_id = format!("Chapter_{}", nanoid!());

        let chapter = DatabaseChapter {
            id: chapter_id.clone(),
            epub_document_id: req.epub_document_id,
            kindle_document_id: req.kindle_document_id,
            title: req.title,
            order: req.order,
            created_at: now,
            updated_at: now,
        };

        match create_chapter(&chapter).await {
            Ok(_) => Ok(Response::new(CreateChapterResponse {
                chapter: Some(database_to_proto_chapter(chapter)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create chapter: {}", e))),
        }
    }

    async fn update_chapter(
        &self,
        request: Request<UpdateChapterRequest>,
    ) -> Result<Response<UpdateChapterResponse>, Status> {
        let req = request.into_inner();
        let mut chapter = get_chapter(&req.id).await
            .map_err(|e| Status::not_found(format!("Chapter not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("Chapter not found: {}", req.id)))?;

        if let Some(title) = req.title {
            chapter.title = title;
        }
        if let Some(order) = req.order {
            chapter.order = order;
        }
        chapter.updated_at = Utc::now();

        match update_chapter(&chapter).await {
            Ok(_) => Ok(Response::new(UpdateChapterResponse {
                chapter: Some(database_to_proto_chapter(chapter)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update chapter: {}", e))),
        }
    }

    async fn get_paragraphs(
        &self,
        request: Request<GetParagraphsRequest>,
    ) -> Result<Response<GetParagraphsResponse>, Status> {
        let req = request.into_inner();
        let paragraphs = if let Some(chapter_id) = req.chapter_id {
            get_paragraphs_by_parent(Some(&chapter_id), None).await
        } else if let Some(document_id) = req.document_id {
            get_paragraphs_by_epub_document(&document_id).await
        } else {
            return Err(Status::invalid_argument("Either chapter_id or document_id must be provided"));
        };

        match paragraphs {
            Ok(paragraphs) => {
                let proto_paragraphs: Vec<Paragraph> = paragraphs
                    .into_iter()
                    .map(database_to_proto_paragraph)
                    .collect();
                Ok(Response::new(GetParagraphsResponse {
                    paragraphs: proto_paragraphs,
                }))
            }
            Err(e) => Err(Status::internal(format!("Failed to get paragraphs: {}", e))),
        }
    }

    async fn create_paragraph(
        &self,
        request: Request<CreateParagraphRequest>,
    ) -> Result<Response<CreateParagraphResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let paragraph_id = format!("Paragraph_{}", nanoid!());

        let paragraph = DatabaseParagraph {
            id: paragraph_id.clone(),
            chapter_id: req.chapter_id,
            section_id: req.section_id,
            order: req.order,
            style: req.style,
            created_at: now,
            updated_at: now,
        };

        match create_paragraph(&paragraph).await {
            Ok(_) => Ok(Response::new(CreateParagraphResponse {
                paragraph: Some(database_to_proto_paragraph(paragraph)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create paragraph: {}", e))),
        }
    }

    async fn update_paragraph(
        &self,
        request: Request<UpdateParagraphRequest>,
    ) -> Result<Response<UpdateParagraphResponse>, Status> {
        let req = request.into_inner();
        let mut paragraph = get_paragraph(&req.id).await
            .map_err(|e| Status::not_found(format!("Paragraph not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("Paragraph not found: {}", req.id)))?;

        if let Some(order) = req.order {
            paragraph.order = order;
        }
        if let Some(style) = req.style {
            paragraph.style = Some(style);
        }
        paragraph.updated_at = Utc::now();

        match update_paragraph(&paragraph).await {
            Ok(_) => Ok(Response::new(UpdateParagraphResponse {
                paragraph: Some(database_to_proto_paragraph(paragraph)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update paragraph: {}", e))),
        }
    }

    async fn get_text_nodes(
        &self,
        request: Request<GetTextNodesRequest>,
    ) -> Result<Response<GetTextNodesResponse>, Status> {
        let req = request.into_inner();
        match get_text_nodes_by_paragraph(&req.paragraph_id).await {
            Ok(text_nodes) => {
                let proto_text_nodes: Vec<TextNode> = text_nodes
                    .into_iter()
                    .map(database_to_proto_text_node)
                    .collect();
                Ok(Response::new(GetTextNodesResponse {
                    text_nodes: proto_text_nodes,
                }))
            }
            Err(e) => Err(Status::internal(format!("Failed to get text nodes: {}", e))),
        }
    }

    async fn create_text_node(
        &self,
        request: Request<CreateTextNodeRequest>,
    ) -> Result<Response<CreateTextNodeResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let text_node_id = format!("TextNode_{}", nanoid!());

        let text_node = DatabaseTextNode {
            id: text_node_id.clone(),
            paragraph_id: req.paragraph_id,
            content: req.content,
            order: req.order,
            style: req.style,
            created_at: now,
            updated_at: now,
        };

        match create_text_node(&text_node).await {
            Ok(_) => Ok(Response::new(CreateTextNodeResponse {
                text_node: Some(database_to_proto_text_node(text_node)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create text node: {}", e))),
        }
    }

    async fn update_text_node(
        &self,
        request: Request<UpdateTextNodeRequest>,
    ) -> Result<Response<UpdateTextNodeResponse>, Status> {
        let req = request.into_inner();
        let mut text_node = get_text_node(&req.id).await
            .map_err(|e| Status::not_found(format!("Text node not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("Text node not found: {}", req.id)))?;

        if let Some(content) = req.content {
            text_node.content = content;
        }
        if let Some(order) = req.order {
            text_node.order = order;
        }
        if let Some(style) = req.style {
            text_node.style = Some(style);
        }
        text_node.updated_at = Utc::now();

        match update_text_node(&text_node).await {
            Ok(_) => Ok(Response::new(UpdateTextNodeResponse {
                text_node: Some(database_to_proto_text_node(text_node)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update text node: {}", e))),
        }
    }

    async fn delete_text_node(
        &self,
        request: Request<DeleteTextNodeRequest>,
    ) -> Result<Response<DeleteTextNodeResponse>, Status> {
        let req = request.into_inner();
        match delete_text_node(&req.id).await {
            Ok(_) => Ok(Response::new(DeleteTextNodeResponse { success: true })),
            Err(e) => Err(Status::internal(format!("Failed to delete text node: {}", e))),
        }
    }
}

