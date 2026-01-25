/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/grpc-manga-editor
 * 
 * gRPC service implementation for Manga Editor
 */
use tonic::{Request, Response, Status};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};
use sqlx::Row;
use crate::ports::postgres::PostgresPool;
use crate::service::error::{sqlx_error_to_status, uuid_error_to_status, json_error_to_status};

// Include generated proto code
pub mod proto {
    tonic::include_proto!("manga_editor");
}

use proto::manga_editor_service_server::MangaEditorService;
use proto::*;

pub struct MangaEditorServiceImpl {
    pool: PostgresPool,
}

impl MangaEditorServiceImpl {
    pub fn new(pool: PostgresPool) -> Self {
        Self { pool }
    }
}

#[tonic::async_trait]
impl MangaEditorService for MangaEditorServiceImpl {
    async fn health(
        &self,
        _request: Request<HealthRequest>,
    ) -> Result<Response<HealthResponse>, Status> {
        Ok(Response::new(HealthResponse {
            status: "ok".to_string(),
        }))
    }

    async fn get_project(
        &self,
        request: Request<GetProjectRequest>,
    ) -> Result<Response<Project>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let row = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM manga_projects
            WHERE id = $1
            "#,
        )
        .bind(uuid)
        .fetch_optional(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        match row {
            Some(row) => Ok(Response::new(Project {
                id: row.0.to_string(),
                title: row.1,
                description: row.2,
                created_at: row.3.to_rfc3339(),
                updated_at: row.4.to_rfc3339(),
            })),
            None => Err(Status::not_found("Project not found")),
        }
    }

    async fn list_projects(
        &self,
        _request: Request<ListProjectsRequest>,
    ) -> Result<Response<ListProjectsResponse>, Status> {
        let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            SELECT id, title, description, created_at, updated_at
            FROM manga_projects
            ORDER BY created_at DESC
            "#,
        )
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let projects = rows
            .into_iter()
            .map(|row| Project {
                id: row.0.to_string(),
                title: row.1,
                description: row.2,
                created_at: row.3.to_rfc3339(),
                updated_at: row.4.to_rfc3339(),
            })
            .collect();

        Ok(Response::new(ListProjectsResponse { projects }))
    }

    async fn create_project(
        &self,
        request: Request<CreateProjectRequest>,
    ) -> Result<Response<Project>, Status> {
        let req = request.into_inner();
        
        let title = req.title;
        if title.is_empty() {
            return Err(Status::invalid_argument("Title is required"));
        }
        if title.trim().is_empty() {
            return Err(Status::invalid_argument("Title cannot be empty"));
        }

        let row = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_projects (title, description)
            VALUES ($1, $2)
            RETURNING id, title, description, created_at, updated_at
            "#,
        )
        .bind(&title)
        .bind(&req.description)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        Ok(Response::new(Project {
            id: row.0.to_string(),
            title: row.1,
            description: row.2,
            created_at: row.3.to_rfc3339(),
            updated_at: row.4.to_rfc3339(),
        }))
    }

    async fn update_project(
        &self,
        request: Request<UpdateProjectRequest>,
    ) -> Result<Response<Project>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        // Build update query dynamically
        let mut updates = Vec::new();
        if req.title.is_some() {
            updates.push("title = $2");
        }
        if req.description.is_some() {
            updates.push("description = $3");
        }
        if updates.is_empty() {
            return Err(Status::invalid_argument("No fields to update"));
        }

        let query = format!(
            "UPDATE manga_projects SET {}, updated_at = NOW() WHERE id = $1 RETURNING id, title, description, created_at, updated_at",
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, (Uuid, String, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(&query)
            .bind(uuid);

        if let Some(title) = &req.title {
            query_builder = query_builder.bind(title);
        }
        if let Some(description) = &req.description {
            query_builder = query_builder.bind(description);
        }

        let row = query_builder
            .fetch_optional(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?;

        match row {
            Some(row) => Ok(Response::new(Project {
                id: row.0.to_string(),
                title: row.1,
                description: row.2,
                created_at: row.3.to_rfc3339(),
                updated_at: row.4.to_rfc3339(),
            })),
            None => Err(Status::not_found("Project not found")),
        }
    }

    async fn delete_project(
        &self,
        request: Request<DeleteProjectRequest>,
    ) -> Result<Response<DeleteProjectResponse>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let rows_affected = sqlx::query("DELETE FROM manga_projects WHERE id = $1")
            .bind(uuid)
            .execute(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?
            .rows_affected();

        Ok(Response::new(DeleteProjectResponse {
            success: rows_affected > 0,
        }))
    }

    async fn get_script(
        &self,
        request: Request<GetScriptRequest>,
    ) -> Result<Response<Script>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Script ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let row = sqlx::query(
            r#"
            SELECT id, project_id, script_id, title, page_count, script_data, created_at, updated_at
            FROM manga_scripts
            WHERE id = $1
            "#,
        )
        .bind(uuid)
        .fetch_optional(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        match row {
            Some(row) => {
                let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
                let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
                let script_id: String = row.try_get("script_id").map_err(|e| Status::internal(format!("Failed to parse script_id: {}", e)))?;
                let title: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
                let page_count: Option<i32> = row.try_get("page_count").ok();
                let script_data: serde_json::Value = row.try_get("script_data").map_err(|e| Status::internal(format!("Failed to parse script_data: {}", e)))?;
                let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

                Ok(Response::new(Script {
                    id: id.to_string(),
                    project_id: project_id.to_string(),
                    script_id,
                    title,
                    page_count,
                    script_data: script_data.to_string(),
                    created_at: created_at.to_rfc3339(),
                    updated_at: updated_at.to_rfc3339(),
                }))
            }
            None => Err(Status::not_found("Script not found")),
        }
    }

    async fn list_scripts(
        &self,
        request: Request<ListScriptsRequest>,
    ) -> Result<Response<ListScriptsResponse>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let rows = sqlx::query(
            r#"
            SELECT id, project_id, script_id, title, page_count, script_data, created_at, updated_at
            FROM manga_scripts
            WHERE project_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(project_uuid)
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let mut scripts = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
            let script_id: String = row.try_get("script_id").map_err(|e| Status::internal(format!("Failed to parse script_id: {}", e)))?;
            let title: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
            let page_count: Option<i32> = row.try_get("page_count").ok();
            let script_data: serde_json::Value = row.try_get("script_data").map_err(|e| Status::internal(format!("Failed to parse script_data: {}", e)))?;
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

            scripts.push(Script {
                id: id.to_string(),
                project_id: project_id.to_string(),
                script_id,
                title,
                page_count,
                script_data: script_data.to_string(),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListScriptsResponse { scripts }))
    }

    async fn create_script(
        &self,
        request: Request<CreateScriptRequest>,
    ) -> Result<Response<Script>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let script_id = req.script_id;
        if script_id.is_empty() {
            return Err(Status::invalid_argument("Script ID is required"));
        }
        let title = req.title;
        if title.is_empty() {
            return Err(Status::invalid_argument("Title is required"));
        }
        let script_data_str = req.script_data;
        if script_data_str.is_empty() {
            return Err(Status::invalid_argument("Script data is required"));
        }
        
        let script_data: serde_json::Value = serde_json::from_str(&script_data_str)
            .map_err(json_error_to_status)?;

        let row = sqlx::query(
            r#"
            INSERT INTO manga_scripts (project_id, script_id, title, page_count, script_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, project_id, script_id, title, page_count, script_data, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(&script_id)
        .bind(&title)
        .bind(&req.page_count)
        .bind(&script_data)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
        let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
        let script_id: String = row.try_get("script_id").map_err(|e| Status::internal(format!("Failed to parse script_id: {}", e)))?;
        let title: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
        let page_count: Option<i32> = row.try_get("page_count").ok();
        let script_data: serde_json::Value = row.try_get("script_data").map_err(|e| Status::internal(format!("Failed to parse script_data: {}", e)))?;
        let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
        let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

        Ok(Response::new(Script {
            id: id.to_string(),
            project_id: project_id.to_string(),
            script_id,
            title,
            page_count,
            script_data: script_data.to_string(),
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        }))
    }

    async fn update_script(
        &self,
        request: Request<UpdateScriptRequest>,
    ) -> Result<Response<Script>, Status> {
        // TODO: Implement update script
        Err(Status::unimplemented("Update script not implemented"))
    }

    async fn get_page(
        &self,
        request: Request<GetPageRequest>,
    ) -> Result<Response<Page>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Page ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let row = sqlx::query(
            r#"
            SELECT id, project_id, script_id, page_id, page_type, description, page_number, 
                   width, height, konva_stage_json, created_at, updated_at
            FROM manga_pages
            WHERE id = $1
            "#,
        )
        .bind(uuid)
        .fetch_optional(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        match row {
            Some(row) => {
                let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
                let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
                let script_id: Uuid = row.try_get("script_id").map_err(|e| Status::internal(format!("Failed to parse script_id: {}", e)))?;
                let page_id: String = row.try_get("page_id").map_err(|e| Status::internal(format!("Failed to parse page_id: {}", e)))?;
                let page_type: Option<String> = row.try_get("page_type").ok();
                let description: Option<String> = row.try_get("description").ok();
                let page_number: Option<i32> = row.try_get("page_number").ok();
                let width: i32 = row.try_get("width").map_err(|e| Status::internal(format!("Failed to parse width: {}", e)))?;
                let height: i32 = row.try_get("height").map_err(|e| Status::internal(format!("Failed to parse height: {}", e)))?;
                let konva_stage_json: Option<serde_json::Value> = row.try_get("konva_stage_json").ok();
                let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

                Ok(Response::new(Page {
                    id: id.to_string(),
                    project_id: project_id.to_string(),
                    script_id: script_id.to_string(),
                    page_id,
                    page_type,
                    description,
                    page_number,
                    width,
                    height,
                    konva_stage_json: konva_stage_json.map(|v| v.to_string()),
                    created_at: created_at.to_rfc3339(),
                    updated_at: updated_at.to_rfc3339(),
                }))
            }
            None => Err(Status::not_found("Page not found")),
        }
    }

    async fn list_pages(
        &self,
        request: Request<ListPagesRequest>,
    ) -> Result<Response<ListPagesResponse>, Status> {
        let req = request.into_inner();
        let script_id = req.script_id;
        if script_id.is_empty() {
            return Err(Status::invalid_argument("Script ID is required"));
        }
        let script_uuid = Uuid::parse_str(&script_id)
            .map_err(uuid_error_to_status)?;

        let rows = sqlx::query(
            r#"
            SELECT id, project_id, script_id, page_id, page_type, description, page_number, 
                   width, height, konva_stage_json, created_at, updated_at
            FROM manga_pages
            WHERE script_id = $1
            ORDER BY page_number ASC, created_at ASC
            "#,
        )
        .bind(script_uuid)
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let mut pages = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
            let script_id: Uuid = row.try_get("script_id").map_err(|e| Status::internal(format!("Failed to parse script_id: {}", e)))?;
            let page_id: String = row.try_get("page_id").map_err(|e| Status::internal(format!("Failed to parse page_id: {}", e)))?;
            let page_type: Option<String> = row.try_get("page_type").ok();
            let description: Option<String> = row.try_get("description").ok();
            let page_number: Option<i32> = row.try_get("page_number").ok();
            let width: i32 = row.try_get("width").map_err(|e| Status::internal(format!("Failed to parse width: {}", e)))?;
            let height: i32 = row.try_get("height").map_err(|e| Status::internal(format!("Failed to parse height: {}", e)))?;
            let konva_stage_json: Option<serde_json::Value> = row.try_get("konva_stage_json").ok();
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

            pages.push(Page {
                id: id.to_string(),
                project_id: project_id.to_string(),
                script_id: script_id.to_string(),
                page_id,
                page_type,
                description,
                page_number,
                width,
                height,
                konva_stage_json: konva_stage_json.map(|v| v.to_string()),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListPagesResponse { pages }))
    }

    async fn create_page(
        &self,
        request: Request<CreatePageRequest>,
    ) -> Result<Response<Page>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let script_id = req.script_id;
        if script_id.is_empty() {
            return Err(Status::invalid_argument("Script ID is required"));
        }
        let script_uuid = Uuid::parse_str(&script_id)
            .map_err(uuid_error_to_status)?;

        // Generate page_id if not provided
        let page_id = if req.page_id.is_empty() {
            let page_number = req.page_number.unwrap_or(1);
            format!("page_{}", page_number)
        } else {
            req.page_id
        };

        let page_type = req.page_type.unwrap_or_else(|| "default".to_string());
        let page_number = req.page_number.unwrap_or(1);
        let width = req.width.unwrap_or(800);
        let height = req.height.unwrap_or(1200);
        let konva_stage_json = req.konva_stage_json.map(|s| {
            serde_json::from_str::<serde_json::Value>(&s)
                .unwrap_or_else(|_| serde_json::json!({}))
        });

        let page_row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, Option<String>, Option<String>, Option<i32>, i32, i32, Option<serde_json::Value>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_pages (project_id, script_id, page_id, page_type, description, page_number, width, height, konva_stage_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, project_id, script_id, page_id, page_type, description, page_number, width, height, konva_stage_json, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(script_uuid)
        .bind(&page_id)
        .bind(&page_type)
        .bind(&req.description)
        .bind(page_number)
        .bind(width)
        .bind(height)
        .bind(&konva_stage_json)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        Ok(Response::new(Page {
            id: page_row.0.to_string(),
            project_id: page_row.1.to_string(),
            script_id: page_row.2.to_string(),
            page_id: page_row.3,
            page_type: page_row.4,
            description: page_row.5,
            page_number: page_row.6,
            width: page_row.7,
            height: page_row.8,
            konva_stage_json: page_row.9.map(|v| v.to_string()),
            created_at: page_row.10.to_rfc3339(),
            updated_at: page_row.11.to_rfc3339(),
        }))
    }

    async fn update_page(
        &self,
        _request: Request<UpdatePageRequest>,
    ) -> Result<Response<Page>, Status> {
        // TODO: Implement update page
        Err(Status::unimplemented("Update page not implemented"))
    }

    async fn get_panel(
        &self,
        _request: Request<GetPanelRequest>,
    ) -> Result<Response<Panel>, Status> {
        // TODO: Implement get panel
        Err(Status::unimplemented("Get panel not implemented"))
    }

    async fn list_panels(
        &self,
        request: Request<ListPanelsRequest>,
    ) -> Result<Response<ListPanelsResponse>, Status> {
        let req = request.into_inner();
        let page_id = req.page_id;
        if page_id.is_empty() {
            return Err(Status::invalid_argument("Page ID is required"));
        }
        let page_uuid = Uuid::parse_str(&page_id)
            .map_err(uuid_error_to_status)?;

        let rows = sqlx::query(
            r#"
            SELECT id, project_id, page_id, panel_id, layout, visual, 
                   panel_data, image_url, image_base64, image_data,
                   x, y, width, height, z_index,
                   created_at, updated_at
            FROM manga_panels
            WHERE page_id = $1
            ORDER BY panel_id ASC
            "#,
        )
        .bind(page_uuid)
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let mut panels = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
            let page_id_uuid: Uuid = row.try_get("page_id").map_err(|e| Status::internal(format!("Failed to parse page_id: {}", e)))?;
            let panel_id: i32 = row.try_get("panel_id").map_err(|e| Status::internal(format!("Failed to parse panel_id: {}", e)))?;
            let layout: Option<String> = row.try_get("layout").ok();
            let visual: Option<String> = row.try_get("visual").ok();
            let panel_data: serde_json::Value = row.try_get("panel_data").map_err(|e| Status::internal(format!("Failed to parse panel_data: {}", e)))?;
            let image_url: Option<String> = row.try_get("image_url").ok();
            let image_base64: Option<String> = row.try_get("image_base64").ok();
            let image_data: Option<Vec<u8>> = row.try_get("image_data").ok();
            let x: Option<i32> = row.try_get("x").ok();
            let y: Option<i32> = row.try_get("y").ok();
            let width: Option<i32> = row.try_get("width").ok();
            let height: Option<i32> = row.try_get("height").ok();
            let z_index: i32 = row.try_get("z_index").map_err(|e| Status::internal(format!("Failed to parse z_index: {}", e)))?;
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

            let dialogue = if let Some(dialogue_array) = panel_data.get("dialogue").and_then(|v| v.as_array()) {
                dialogue_array
                    .iter()
                    .filter_map(|item| {
                        if let (Some(speaker), Some(text)) = (
                            item.get("speaker").and_then(|v| v.as_str()),
                            item.get("text").and_then(|v| v.as_str()),
                        ) {
                            Some(Dialogue {
                                speaker: speaker.to_string(),
                                text: text.to_string(),
                            })
                        } else {
                            None
                        }
                    })
                    .collect()
            } else {
                Vec::new()
            };

            let image_data_base64 = image_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

            panels.push(Panel {
                id: id.to_string(),
                project_id: project_id.to_string(),
                page_id: page_id_uuid.to_string(),
                panel_id,
                layout,
                visual,
                dialogue,
                x,
                y,
                width,
                height,
                z_index,
                image_url,
                image_base64,
                image_data: image_data_base64,
                panel_data: panel_data.to_string(),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListPanelsResponse { panels }))
    }

    async fn create_panel(
        &self,
        request: Request<CreatePanelRequest>,
    ) -> Result<Response<Panel>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let page_id = req.page_id;
        if page_id.is_empty() {
            return Err(Status::invalid_argument("Page ID is required"));
        }
        let page_uuid = Uuid::parse_str(&page_id)
            .map_err(uuid_error_to_status)?;

        let panel_id = req.panel_id;
        let x = req.x.unwrap_or(50);
        let y = req.y.unwrap_or(50);
        let width = req.width.unwrap_or(700);
        let height = req.height.unwrap_or(1000);
        let z_index = req.z_index.unwrap_or(1);

        // Parse panel_data or use empty JSON object as default
        let panel_data: serde_json::Value = if req.panel_data.is_empty() {
            serde_json::json!({})
        } else {
            serde_json::from_str(&req.panel_data)
                .map_err(json_error_to_status)?
        };

        let panel_row = sqlx::query(
            r#"
            INSERT INTO manga_panels (project_id, page_id, panel_id, layout, visual, dialogue, x, y, width, height, z_index, image_url, image_base64, image_data, panel_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, project_id, page_id, panel_id, layout, visual, 
                   panel_data, image_url, image_base64, image_data,
                   x, y, width, height, z_index,
                   created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(page_uuid)
        .bind(panel_id)
        .bind(&req.layout)
        .bind(&req.visual)
        .bind(serde_json::to_value(req.dialogue.iter().map(|d| serde_json::json!({
            "speaker": d.speaker,
            "text": d.text,
        })).collect::<Vec<_>>()).unwrap_or(serde_json::json!([])))
        .bind(x)
        .bind(y)
        .bind(width)
        .bind(height)
        .bind(z_index)
        .bind(&req.image_url)
        .bind(&req.image_base64)
        .bind::<Option<Vec<u8>>>(None) // image_data is not in CreatePanelRequest proto
        .bind(&panel_data)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let id: Uuid = panel_row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
        let project_id_db: Uuid = panel_row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
        let page_id_db: Uuid = panel_row.try_get("page_id").map_err(|e| Status::internal(format!("Failed to parse page_id: {}", e)))?;
        let panel_id_db: i32 = panel_row.try_get("panel_id").map_err(|e| Status::internal(format!("Failed to parse panel_id: {}", e)))?;
        let layout: Option<String> = panel_row.try_get("layout").ok();
        let visual: Option<String> = panel_row.try_get("visual").ok();
        let panel_data_db: serde_json::Value = panel_row.try_get("panel_data").map_err(|e| Status::internal(format!("Failed to parse panel_data: {}", e)))?;
        let image_url: Option<String> = panel_row.try_get("image_url").ok();
        let image_base64: Option<String> = panel_row.try_get("image_base64").ok();
        let image_data: Option<Vec<u8>> = panel_row.try_get("image_data").ok();
        let x_db: i32 = panel_row.try_get("x").map_err(|e| Status::internal(format!("Failed to parse x: {}", e)))?;
        let y_db: i32 = panel_row.try_get("y").map_err(|e| Status::internal(format!("Failed to parse y: {}", e)))?;
        let width_db: i32 = panel_row.try_get("width").map_err(|e| Status::internal(format!("Failed to parse width: {}", e)))?;
        let height_db: i32 = panel_row.try_get("height").map_err(|e| Status::internal(format!("Failed to parse height: {}", e)))?;
        let z_index_db: i32 = panel_row.try_get("z_index").map_err(|e| Status::internal(format!("Failed to parse z_index: {}", e)))?;
        let created_at: chrono::DateTime<chrono::Utc> = panel_row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
        let updated_at: chrono::DateTime<chrono::Utc> = panel_row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

        // Parse dialogue from panel_data or use empty array
        let dialogue: Vec<Dialogue> = panel_data_db.get("dialogue")
            .and_then(|d| {
                if let Some(arr) = d.as_array() {
                    Some(arr.iter().filter_map(|item| {
                        Some(Dialogue {
                            speaker: item.get("speaker")?.as_str()?.to_string(),
                            text: item.get("text")?.as_str()?.to_string(),
                        })
                    }).collect())
                } else {
                    None
                }
            })
            .unwrap_or_default();

        let image_data_base64 = image_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

        Ok(Response::new(Panel {
            id: id.to_string(),
            project_id: project_id_db.to_string(),
            page_id: page_id_db.to_string(),
            panel_id: panel_id_db,
            layout,
            visual,
            dialogue,
            x: Some(x_db),
            y: Some(y_db),
            width: Some(width_db),
            height: Some(height_db),
            z_index: z_index_db,
            image_url,
            image_base64,
            image_data: image_data_base64,
            panel_data: panel_data_db.to_string(),
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        }))
    }

    async fn update_panel(
        &self,
        _request: Request<UpdatePanelRequest>,
    ) -> Result<Response<Panel>, Status> {
        // TODO: Implement update panel
        Err(Status::unimplemented("Update panel not implemented"))
    }

    async fn generate_story(
        &self,
        request: Request<GenerateStoryRequest>,
    ) -> Result<Response<GenerateStoryResponse>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let story_prompt = req.story_prompt;
        if story_prompt.is_empty() {
            return Err(Status::invalid_argument("Story prompt is required"));
        }

        // Generate a script ID
        let script_id = format!("script_{}", Uuid::new_v4());

        // Create manga script
        let script_row = sqlx::query_as::<_, (Uuid, Uuid, String, String, Option<i32>, serde_json::Value, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_scripts (project_id, script_id, title, page_count, script_data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, project_id, script_id, title, page_count, script_data, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(&script_id)
        .bind(format!("Generated Story: {}", &story_prompt[..story_prompt.len().min(50)]))
        .bind(1i32) // Default to 1 page for now
        .bind(serde_json::json!({
            "prompt": story_prompt,
            "continue_from_previous": req.continue_from_previous.unwrap_or(false),
            "preset": req.preset.unwrap_or_default(),
        }))
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let script = Script {
            id: script_row.0.to_string(),
            project_id: script_row.1.to_string(),
            script_id: script_row.2,
            title: script_row.3,
            page_count: script_row.4,
            script_data: script_row.5.to_string(),
            created_at: script_row.6.to_rfc3339(),
            updated_at: script_row.7.to_rfc3339(),
        };

        // Create a default page
        let page_id_str = format!("page_1");
        let page_row = sqlx::query_as::<_, (Uuid, Uuid, Uuid, String, Option<String>, Option<String>, Option<i32>, i32, i32, Option<serde_json::Value>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            r#"
            INSERT INTO manga_pages (project_id, script_id, page_id, page_type, description, page_number, width, height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, project_id, script_id, page_id, page_type, description, page_number, width, height, konva_stage_json, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(script_row.0) // Use script UUID
        .bind(&page_id_str)
        .bind("default" as &str)
        .bind::<Option<String>>(None)
        .bind(1i32)
        .bind(800i32) // Default manga page width (原稿用紙サイズ)
        .bind(1200i32) // Default manga page height (原稿用紙サイズ)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let page = Page {
            id: page_row.0.to_string(),
            project_id: page_row.1.to_string(),
            script_id: page_row.2.to_string(),
            page_id: page_row.3,
            page_type: page_row.4,
            description: page_row.5,
            page_number: page_row.6,
            width: page_row.7,
            height: page_row.8,
            konva_stage_json: page_row.9.map(|v| v.to_string()),
            created_at: page_row.10.to_rfc3339(),
            updated_at: page_row.11.to_rfc3339(),
        };

        // Create a default panel for the page
        let panel_id = 1i32;
        let _panel_row = sqlx::query(
            r#"
            INSERT INTO manga_panels (project_id, page_id, panel_id, layout, visual, x, y, width, height, z_index, panel_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            "#,
        )
        .bind(project_uuid)
        .bind(page_row.0) // Use page UUID
        .bind(panel_id)
        .bind::<Option<String>>(None) // layout
        .bind::<Option<String>>(None) // visual
        .bind(50i32) // x: default position
        .bind(50i32) // y: default position
        .bind(700i32) // width: default size (原稿用紙サイズに合わせて調整)
        .bind(1000i32) // height: default size (原稿用紙サイズに合わせて調整)
        .bind(1i32) // z_index: default layer
        .bind(serde_json::json!({})) // panel_data: empty JSON object
        .execute(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        Ok(Response::new(GenerateStoryResponse {
            script: Some(script),
            pages: vec![page],
        }))
    }

    async fn generate_panel_images(
        &self,
        _request: Request<GeneratePanelImagesRequest>,
    ) -> Result<Response<GeneratePanelImagesResponse>, Status> {
        // TODO: Implement generate panel images (similar to GraphQL mutation)
        Err(Status::unimplemented("Generate panel images not implemented"))
    }

    async fn list_ai_models(
        &self,
        _request: Request<ListAiModelsRequest>,
    ) -> Result<Response<ListAiModelsResponse>, Status> {
        // TODO: Implement list AI models
        Ok(Response::new(ListAiModelsResponse { models: vec![] }))
    }

    async fn list_generated_images(
        &self,
        request: Request<ListGeneratedImagesRequest>,
    ) -> Result<Response<ListGeneratedImagesResponse>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let query = if let Some(panel_id) = req.panel_id {
            let panel_uuid = Uuid::parse_str(&panel_id)
                .map_err(uuid_error_to_status)?;
            sqlx::query(
                r#"
                SELECT id, project_id, panel_id, prompt, negative_prompt, 
                       image_url, image_base64, image_data, provider, model, model_id, created_at
                FROM manga_generated_images
                WHERE project_id = $1 AND panel_id = $2
                ORDER BY created_at DESC
                "#,
            )
            .bind(project_uuid)
            .bind(panel_uuid)
        } else {
            sqlx::query(
                r#"
                SELECT id, project_id, panel_id, prompt, negative_prompt, 
                       image_url, image_base64, image_data, provider, model, model_id, created_at
                FROM manga_generated_images
                WHERE project_id = $1
                ORDER BY created_at DESC
                "#,
            )
            .bind(project_uuid)
        };

        let rows = query
            .fetch_all(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?;

        let mut images = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
            let panel_id: Option<Uuid> = row.try_get("panel_id").ok();
            let prompt: String = row.try_get("prompt").map_err(|e| Status::internal(format!("Failed to parse prompt: {}", e)))?;
            let negative_prompt: Option<String> = row.try_get("negative_prompt").ok();
            let image_url: Option<String> = row.try_get("image_url").ok();
            let image_base64: Option<String> = row.try_get("image_base64").ok();
            let image_data: Option<Vec<u8>> = row.try_get("image_data").ok();
            let provider: String = row.try_get("provider").map_err(|e| Status::internal(format!("Failed to parse provider: {}", e)))?;
            let model: String = row.try_get("model").map_err(|e| Status::internal(format!("Failed to parse model: {}", e)))?;
            let model_id: Option<String> = row.try_get("model_id").ok();
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;

            let image_data_base64 = image_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

            images.push(GeneratedImage {
                id: id.to_string(),
                project_id: project_id.to_string(),
                panel_id: panel_id.map(|u| u.to_string()),
                prompt,
                negative_prompt,
                image_url,
                image_base64,
                image_data: image_data_base64,
                provider,
                model,
                model_id,
                created_at: created_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListGeneratedImagesResponse { images }))
    }
}

