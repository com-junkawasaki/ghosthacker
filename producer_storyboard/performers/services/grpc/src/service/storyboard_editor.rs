/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/grpc-storyboard-editor
 * 
 * gRPC service implementation for Storyboard Editor
 */
use tonic::{Request, Response, Status};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};
use sqlx::Row;
use crate::ports::postgres::PostgresPool;
use crate::ports::openai_service::OpenAIService;
use crate::service::error::{sqlx_error_to_status, uuid_error_to_status, json_error_to_status, anyhow_error_to_status};

// Include generated proto code
pub mod proto {
    tonic::include_proto!("storyboard_editor");
}

use proto::storyboard_editor_service_server::StoryboardEditorService;
use proto::*;

pub struct StoryboardEditorServiceImpl {
    pool: PostgresPool,
    openai_service: Option<OpenAIService>,
}

impl StoryboardEditorServiceImpl {
    pub fn new(pool: PostgresPool) -> Self {
        let openai_service = std::env::var("OPENAI_API_KEY")
            .ok()
            .map(|key| OpenAIService::new(key));
        
        Self {
            pool,
            openai_service,
        }
    }
}

#[tonic::async_trait]
impl StoryboardEditorService for StoryboardEditorServiceImpl {
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
            FROM storyboard_projects
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
            FROM storyboard_projects
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
            INSERT INTO storyboard_projects (title, description)
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
            "UPDATE storyboard_projects SET {}, updated_at = NOW() WHERE id = $1 RETURNING id, title, description, created_at, updated_at",
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

        let rows_affected = sqlx::query("DELETE FROM storyboard_projects WHERE id = $1")
            .bind(uuid)
            .execute(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?
            .rows_affected();

        Ok(Response::new(DeleteProjectResponse {
            success: rows_affected > 0,
        }))
    }

    async fn get_storyboard(
        &self,
        request: Request<GetStoryboardRequest>,
    ) -> Result<Response<Storyboard>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let row = sqlx::query(
            r#"
            SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, storyboard_data, created_at, updated_at
            FROM storyboards
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
                let title: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
                let aspect_ratio: String = row.try_get("aspect_ratio").map_err(|e| Status::internal(format!("Failed to parse aspect_ratio: {}", e)))?;
                let resolution: String = row.try_get("resolution").map_err(|e| Status::internal(format!("Failed to parse resolution: {}", e)))?;
                let duration_seconds: Option<i32> = row.try_get("duration_seconds").ok();
                let num_variations: i32 = row.try_get("num_variations").map_err(|e| Status::internal(format!("Failed to parse num_variations: {}", e)))?;
                let storyboard_data: serde_json::Value = row.try_get("storyboard_data").map_err(|e| Status::internal(format!("Failed to parse storyboard_data: {}", e)))?;
                let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

                Ok(Response::new(Storyboard {
                    id: id.to_string(),
                    project_id: project_id.to_string(),
                    title,
                    aspect_ratio,
                    resolution,
                    duration_seconds,
                    num_variations,
                    storyboard_data: storyboard_data.to_string(),
                    created_at: created_at.to_rfc3339(),
                    updated_at: updated_at.to_rfc3339(),
                }))
            }
            None => Err(Status::not_found("Storyboard not found")),
        }
    }

    async fn list_storyboards(
        &self,
        request: Request<ListStoryboardsRequest>,
    ) -> Result<Response<ListStoryboardsResponse>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let rows = sqlx::query(
            r#"
            SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, storyboard_data, created_at, updated_at
            FROM storyboards
            WHERE project_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(project_uuid)
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let mut storyboards = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
            let title: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
            let aspect_ratio: String = row.try_get("aspect_ratio").map_err(|e| Status::internal(format!("Failed to parse aspect_ratio: {}", e)))?;
            let resolution: String = row.try_get("resolution").map_err(|e| Status::internal(format!("Failed to parse resolution: {}", e)))?;
            let duration_seconds: Option<i32> = row.try_get("duration_seconds").ok();
            let num_variations: i32 = row.try_get("num_variations").map_err(|e| Status::internal(format!("Failed to parse num_variations: {}", e)))?;
            let storyboard_data: serde_json::Value = row.try_get("storyboard_data").map_err(|e| Status::internal(format!("Failed to parse storyboard_data: {}", e)))?;
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

            storyboards.push(Storyboard {
                id: id.to_string(),
                project_id: project_id.to_string(),
                title,
                aspect_ratio,
                resolution,
                duration_seconds,
                num_variations,
                storyboard_data: storyboard_data.to_string(),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListStoryboardsResponse { storyboards }))
    }

    async fn create_storyboard(
        &self,
        request: Request<CreateStoryboardRequest>,
    ) -> Result<Response<Storyboard>, Status> {
        let req = request.into_inner();
        let project_id = req.project_id;
        if project_id.is_empty() {
            return Err(Status::invalid_argument("Project ID is required"));
        }
        let project_uuid = Uuid::parse_str(&project_id)
            .map_err(uuid_error_to_status)?;

        let title = req.title;
        if title.is_empty() {
            return Err(Status::invalid_argument("Title is required"));
        }
        
        let aspect_ratio = req.aspect_ratio.unwrap_or_else(|| "16:9".to_string());
        let resolution = req.resolution.unwrap_or_else(|| "1920x1080".to_string());
        let num_variations = req.num_variations.unwrap_or(1);
        
        let storyboard_data_str = req.storyboard_data.unwrap_or_else(|| "{}".to_string());
        let storyboard_data: serde_json::Value = serde_json::from_str(&storyboard_data_str)
            .map_err(json_error_to_status)?;

        let row = sqlx::query(
            r#"
            INSERT INTO storyboards (project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, storyboard_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, storyboard_data, created_at, updated_at
            "#,
        )
        .bind(project_uuid)
        .bind(&title)
        .bind(&aspect_ratio)
        .bind(&resolution)
        .bind(&req.duration_seconds)
        .bind(num_variations)
        .bind(&storyboard_data)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
        let project_id_db: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
        let title_db: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
        let aspect_ratio_db: String = row.try_get("aspect_ratio").map_err(|e| Status::internal(format!("Failed to parse aspect_ratio: {}", e)))?;
        let resolution_db: String = row.try_get("resolution").map_err(|e| Status::internal(format!("Failed to parse resolution: {}", e)))?;
        let duration_seconds_db: Option<i32> = row.try_get("duration_seconds").ok();
        let num_variations_db: i32 = row.try_get("num_variations").map_err(|e| Status::internal(format!("Failed to parse num_variations: {}", e)))?;
        let storyboard_data_db: serde_json::Value = row.try_get("storyboard_data").map_err(|e| Status::internal(format!("Failed to parse storyboard_data: {}", e)))?;
        let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
        let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

        Ok(Response::new(Storyboard {
            id: id.to_string(),
            project_id: project_id_db.to_string(),
            title: title_db,
            aspect_ratio: aspect_ratio_db,
            resolution: resolution_db,
            duration_seconds: duration_seconds_db,
            num_variations: num_variations_db,
            storyboard_data: storyboard_data_db.to_string(),
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        }))
    }

    async fn update_storyboard(
        &self,
        request: Request<UpdateStoryboardRequest>,
    ) -> Result<Response<Storyboard>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        // Build update query dynamically
        let mut updates = Vec::new();
        let mut param_index = 2;
        
        if req.title.is_some() {
            updates.push(format!("title = ${}", param_index));
            param_index += 1;
        }
        if req.aspect_ratio.is_some() {
            updates.push(format!("aspect_ratio = ${}", param_index));
            param_index += 1;
        }
        if req.resolution.is_some() {
            updates.push(format!("resolution = ${}", param_index));
            param_index += 1;
        }
        if req.duration_seconds.is_some() {
            updates.push(format!("duration_seconds = ${}", param_index));
            param_index += 1;
        }
        if req.num_variations.is_some() {
            updates.push(format!("num_variations = ${}", param_index));
            param_index += 1;
        }
        if req.storyboard_data.is_some() {
            updates.push(format!("storyboard_data = ${}", param_index));
            param_index += 1;
        }
        
        if updates.is_empty() {
            return Err(Status::invalid_argument("No fields to update"));
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            "UPDATE storyboards SET {} WHERE id = $1 RETURNING id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, storyboard_data, created_at, updated_at",
            updates.join(", ")
        );

        let mut query_builder = sqlx::query(&query).bind(uuid);

        if let Some(title) = &req.title {
            query_builder = query_builder.bind(title);
        }
        if let Some(aspect_ratio) = &req.aspect_ratio {
            query_builder = query_builder.bind(aspect_ratio);
        }
        if let Some(resolution) = &req.resolution {
            query_builder = query_builder.bind(resolution);
        }
        if let Some(duration_seconds) = &req.duration_seconds {
            query_builder = query_builder.bind(duration_seconds);
        }
        if let Some(num_variations) = &req.num_variations {
            query_builder = query_builder.bind(num_variations);
        }
        if let Some(storyboard_data_str) = &req.storyboard_data {
            let storyboard_data: serde_json::Value = serde_json::from_str(storyboard_data_str)
                .map_err(json_error_to_status)?;
            query_builder = query_builder.bind(&storyboard_data);
        }

        let row = query_builder
            .fetch_optional(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?;

        match row {
            Some(row) => {
                let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
                let project_id: Uuid = row.try_get("project_id").map_err(|e| Status::internal(format!("Failed to parse project_id: {}", e)))?;
                let title: String = row.try_get("title").map_err(|e| Status::internal(format!("Failed to parse title: {}", e)))?;
                let aspect_ratio: String = row.try_get("aspect_ratio").map_err(|e| Status::internal(format!("Failed to parse aspect_ratio: {}", e)))?;
                let resolution: String = row.try_get("resolution").map_err(|e| Status::internal(format!("Failed to parse resolution: {}", e)))?;
                let duration_seconds: Option<i32> = row.try_get("duration_seconds").ok();
                let num_variations: i32 = row.try_get("num_variations").map_err(|e| Status::internal(format!("Failed to parse num_variations: {}", e)))?;
                let storyboard_data: serde_json::Value = row.try_get("storyboard_data").map_err(|e| Status::internal(format!("Failed to parse storyboard_data: {}", e)))?;
                let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

                Ok(Response::new(Storyboard {
                    id: id.to_string(),
                    project_id: project_id.to_string(),
                    title,
                    aspect_ratio,
                    resolution,
                    duration_seconds,
                    num_variations,
                    storyboard_data: storyboard_data.to_string(),
                    created_at: created_at.to_rfc3339(),
                    updated_at: updated_at.to_rfc3339(),
                }))
            }
            None => Err(Status::not_found("Storyboard not found")),
        }
    }

    async fn delete_storyboard(
        &self,
        request: Request<DeleteStoryboardRequest>,
    ) -> Result<Response<DeleteStoryboardResponse>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let rows_affected = sqlx::query("DELETE FROM storyboards WHERE id = $1")
            .bind(uuid)
            .execute(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?
            .rows_affected();

        Ok(Response::new(DeleteStoryboardResponse {
            success: rows_affected > 0,
        }))
    }

    async fn get_scene(
        &self,
        request: Request<GetSceneRequest>,
    ) -> Result<Response<Scene>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Scene ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let row = sqlx::query(
            r#"
            SELECT id, storyboard_id, scene_number, text_description, media_type, media_url, media_data,
                   start_time_seconds, duration_seconds, transition_type, scene_data, created_at, updated_at
            FROM scenes
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
                let storyboard_id: Uuid = row.try_get("storyboard_id").map_err(|e| Status::internal(format!("Failed to parse storyboard_id: {}", e)))?;
                let scene_number: i32 = row.try_get("scene_number").map_err(|e| Status::internal(format!("Failed to parse scene_number: {}", e)))?;
                let text_description: Option<String> = row.try_get("text_description").ok();
                let media_type: Option<String> = row.try_get("media_type").ok();
                let media_url: Option<String> = row.try_get("media_url").ok();
                let media_data: Option<Vec<u8>> = row.try_get("media_data").ok();
                let start_time_seconds: Option<rust_decimal::Decimal> = row.try_get("start_time_seconds").ok();
                let duration_seconds: Option<rust_decimal::Decimal> = row.try_get("duration_seconds").ok();
                let transition_type: Option<String> = row.try_get("transition_type").ok();
                let scene_data: Option<serde_json::Value> = row.try_get("scene_data").ok();
                let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

                let media_data_base64 = media_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

                Ok(Response::new(Scene {
                    id: id.to_string(),
                    storyboard_id: storyboard_id.to_string(),
                    scene_number,
                    text_description,
                    media_type,
                    media_url,
                    media_data: media_data_base64,
                    start_time_seconds: start_time_seconds.map(|d| d.to_string().parse().unwrap_or(0.0)),
                    duration_seconds: duration_seconds.map(|d| d.to_string().parse().unwrap_or(0.0)),
                    transition_type,
                    scene_data: scene_data.map(|v| v.to_string()),
                    created_at: created_at.to_rfc3339(),
                    updated_at: updated_at.to_rfc3339(),
                }))
            }
            None => Err(Status::not_found("Scene not found")),
        }
    }

    async fn list_scenes(
        &self,
        request: Request<ListScenesRequest>,
    ) -> Result<Response<ListScenesResponse>, Status> {
        let req = request.into_inner();
        let storyboard_id = req.storyboard_id;
        if storyboard_id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let storyboard_uuid = Uuid::parse_str(&storyboard_id)
            .map_err(uuid_error_to_status)?;

        let rows = sqlx::query(
            r#"
            SELECT id, storyboard_id, scene_number, text_description, media_type, media_url, media_data,
                   start_time_seconds, duration_seconds, transition_type, scene_data, created_at, updated_at
            FROM scenes
            WHERE storyboard_id = $1
            ORDER BY scene_number ASC
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let mut scenes = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let storyboard_id_db: Uuid = row.try_get("storyboard_id").map_err(|e| Status::internal(format!("Failed to parse storyboard_id: {}", e)))?;
            let scene_number: i32 = row.try_get("scene_number").map_err(|e| Status::internal(format!("Failed to parse scene_number: {}", e)))?;
            let text_description: Option<String> = row.try_get("text_description").ok();
            let media_type: Option<String> = row.try_get("media_type").ok();
            let media_url: Option<String> = row.try_get("media_url").ok();
            let media_data: Option<Vec<u8>> = row.try_get("media_data").ok();
            let start_time_seconds: Option<rust_decimal::Decimal> = row.try_get("start_time_seconds").ok();
            let duration_seconds: Option<rust_decimal::Decimal> = row.try_get("duration_seconds").ok();
            let transition_type: Option<String> = row.try_get("transition_type").ok();
            let scene_data: Option<serde_json::Value> = row.try_get("scene_data").ok();
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

            let media_data_base64 = media_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

            scenes.push(Scene {
                id: id.to_string(),
                storyboard_id: storyboard_id_db.to_string(),
                scene_number,
                text_description,
                media_type,
                media_url,
                media_data: media_data_base64,
                start_time_seconds: start_time_seconds.map(|d| d.to_string().parse().unwrap_or(0.0)),
                duration_seconds: duration_seconds.map(|d| d.to_string().parse().unwrap_or(0.0)),
                transition_type,
                scene_data: scene_data.map(|v| v.to_string()),
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListScenesResponse { scenes }))
    }

    async fn create_scene(
        &self,
        request: Request<CreateSceneRequest>,
    ) -> Result<Response<Scene>, Status> {
        let req = request.into_inner();
        let storyboard_id = req.storyboard_id;
        if storyboard_id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let storyboard_uuid = Uuid::parse_str(&storyboard_id)
            .map_err(uuid_error_to_status)?;

        let scene_number = req.scene_number;
        let transition_type = req.transition_type.unwrap_or_else(|| "cut".to_string());
        
        let scene_data_str = req.scene_data.unwrap_or_else(|| "{}".to_string());
        let scene_data: serde_json::Value = serde_json::from_str(&scene_data_str)
            .map_err(json_error_to_status)?;

        let media_data_bytes = req.media_data
            .map(|base64_str| general_purpose::STANDARD.decode(base64_str.as_bytes()))
            .transpose()
            .map_err(|e| Status::invalid_argument(format!("Invalid base64 media data: {}", e)))?;

        let row = sqlx::query(
            r#"
            INSERT INTO scenes (storyboard_id, scene_number, text_description, media_type, media_url, media_data,
                               start_time_seconds, duration_seconds, transition_type, scene_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, storyboard_id, scene_number, text_description, media_type, media_url, media_data,
                      start_time_seconds, duration_seconds, transition_type, scene_data, created_at, updated_at
            "#,
        )
        .bind(storyboard_uuid)
        .bind(scene_number)
        .bind(&req.text_description)
        .bind(&req.media_type)
        .bind(&req.media_url)
        .bind(media_data_bytes.as_deref())
        .bind(req.start_time_seconds.map(|s| rust_decimal::Decimal::from_f64(s).unwrap_or_default()))
        .bind(req.duration_seconds.map(|s| rust_decimal::Decimal::from_f64(s).unwrap_or_default()))
        .bind(&transition_type)
        .bind(&scene_data)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
        let storyboard_id_db: Uuid = row.try_get("storyboard_id").map_err(|e| Status::internal(format!("Failed to parse storyboard_id: {}", e)))?;
        let scene_number_db: i32 = row.try_get("scene_number").map_err(|e| Status::internal(format!("Failed to parse scene_number: {}", e)))?;
        let text_description: Option<String> = row.try_get("text_description").ok();
        let media_type: Option<String> = row.try_get("media_type").ok();
        let media_url: Option<String> = row.try_get("media_url").ok();
        let media_data: Option<Vec<u8>> = row.try_get("media_data").ok();
        let start_time_seconds: Option<rust_decimal::Decimal> = row.try_get("start_time_seconds").ok();
        let duration_seconds: Option<rust_decimal::Decimal> = row.try_get("duration_seconds").ok();
        let transition_type_db: Option<String> = row.try_get("transition_type").ok();
        let scene_data_db: Option<serde_json::Value> = row.try_get("scene_data").ok();
        let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
        let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

        let media_data_base64 = media_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

        Ok(Response::new(Scene {
            id: id.to_string(),
            storyboard_id: storyboard_id_db.to_string(),
            scene_number: scene_number_db,
            text_description,
            media_type,
            media_url,
            media_data: media_data_base64,
            start_time_seconds: start_time_seconds.map(|d| d.to_string().parse().unwrap_or(0.0)),
            duration_seconds: duration_seconds.map(|d| d.to_string().parse().unwrap_or(0.0)),
            transition_type: transition_type_db,
            scene_data: scene_data_db.map(|v| v.to_string()),
            created_at: created_at.to_rfc3339(),
            updated_at: updated_at.to_rfc3339(),
        }))
    }

    async fn update_scene(
        &self,
        request: Request<UpdateSceneRequest>,
    ) -> Result<Response<Scene>, Status> {
        // TODO: Implement update scene
        Err(Status::unimplemented("Update scene not implemented"))
    }

    async fn delete_scene(
        &self,
        request: Request<DeleteSceneRequest>,
    ) -> Result<Response<DeleteSceneResponse>, Status> {
        let req = request.into_inner();
        let id = req.id;
        if id.is_empty() {
            return Err(Status::invalid_argument("Scene ID is required"));
        }
        let uuid = Uuid::parse_str(&id)
            .map_err(uuid_error_to_status)?;

        let rows_affected = sqlx::query("DELETE FROM scenes WHERE id = $1")
            .bind(uuid)
            .execute(self.pool.as_ref())
            .await
            .map_err(sqlx_error_to_status)?
            .rows_affected();

        Ok(Response::new(DeleteSceneResponse {
            success: rows_affected > 0,
        }))
    }

    async fn generate_video(
        &self,
        request: Request<GenerateVideoRequest>,
    ) -> Result<Response<GenerateVideoResponse>, Status> {
        let req = request.into_inner();
        let storyboard_id = req.storyboard_id;
        if storyboard_id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let storyboard_uuid = Uuid::parse_str(&storyboard_id)
            .map_err(uuid_error_to_status)?;

        // Get storyboard and scenes
        let storyboard_row = sqlx::query(
            r#"
            SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, storyboard_data
            FROM storyboards
            WHERE id = $1
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_optional(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let storyboard_row = match storyboard_row {
            Some(row) => row,
            None => return Err(Status::not_found("Storyboard not found")),
        };

        let aspect_ratio: String = storyboard_row.try_get("aspect_ratio").map_err(|e| Status::internal(format!("Failed to parse aspect_ratio: {}", e)))?;
        let resolution: String = storyboard_row.try_get("resolution").map_err(|e| Status::internal(format!("Failed to parse resolution: {}", e)))?;
        let duration_seconds: Option<i32> = storyboard_row.try_get("duration_seconds").ok();

        // Get scenes
        let scenes = self.list_scenes(Request::new(ListScenesRequest {
            storyboard_id: storyboard_id.clone(),
        })).await?;

        let scenes_inner = scenes.into_inner().scenes;
        if scenes_inner.is_empty() {
            return Err(Status::failed_precondition("Storyboard has no scenes"));
        }

        // Create video generation record
        let variation_number = req.variation_number.unwrap_or(1);
        let video_row = sqlx::query(
            r#"
            INSERT INTO generated_videos (storyboard_id, variation_number, status)
            VALUES ($1, $2, 'pending')
            RETURNING id, storyboard_id, variation_number, status, created_at
            "#,
        )
        .bind(storyboard_uuid)
        .bind(variation_number)
        .fetch_one(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let video_id: Uuid = video_row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse video id: {}", e)))?;

        // Generate video using OpenAI (async)
        if let Some(ref openai_service) = self.openai_service {
            // Convert scenes to prompt
            let scene_descriptions: Vec<String> = scenes_inner
                .iter()
                .enumerate()
                .map(|(i, scene)| {
                    format!("Scene {}: {}", i + 1, scene.text_description.as_deref().unwrap_or(""))
                })
                .collect();
            
            let prompt = format!("Create a video with the following scenes:\n{}", scene_descriptions.join("\n"));

            // Generate video
            let openai_request = crate::ports::openai_service::VideoGenerationRequest {
                prompt,
                model: Some("sora".to_string()), // Placeholder - actual model name may differ
                duration: duration_seconds.map(|d| d as u32),
                aspect_ratio: Some(aspect_ratio),
                resolution: Some(resolution),
            };

            match openai_service.generate_video(openai_request).await {
                Ok(response) => {
                    // Update video record with OpenAI job ID
                    sqlx::query(
                        r#"
                        UPDATE generated_videos
                        SET openai_job_id = $1, status = 'processing', updated_at = NOW()
                        WHERE id = $2
                        "#,
                    )
                    .bind(&response.job_id)
                    .bind(video_id)
                    .execute(self.pool.as_ref())
                    .await
                    .map_err(sqlx_error_to_status)?;

                    Ok(Response::new(GenerateVideoResponse {
                        video_id: video_id.to_string(),
                        status: "processing".to_string(),
                        openai_job_id: Some(response.job_id),
                        error_message: None,
                    }))
                }
                Err(e) => {
                    // Update video record with error
                    sqlx::query(
                        r#"
                        UPDATE generated_videos
                        SET status = 'failed', error_message = $1, updated_at = NOW()
                        WHERE id = $2
                        "#,
                    )
                    .bind(e.to_string())
                    .bind(video_id)
                    .execute(self.pool.as_ref())
                    .await
                    .map_err(sqlx_error_to_status)?;

                    Err(Status::internal(format!("Failed to generate video: {}", e)))
                }
            }
        } else {
            Err(Status::failed_precondition("OpenAI API key not configured"))
        }
    }

    async fn get_video_status(
        &self,
        request: Request<GetVideoStatusRequest>,
    ) -> Result<Response<VideoStatus>, Status> {
        let req = request.into_inner();
        let video_id = req.video_id;
        if video_id.is_empty() {
            return Err(Status::invalid_argument("Video ID is required"));
        }
        let uuid = Uuid::parse_str(&video_id)
            .map_err(uuid_error_to_status)?;

        let row = sqlx::query(
            r#"
            SELECT id, storyboard_id, variation_number, video_url, video_data, status, openai_job_id, error_message, created_at, updated_at
            FROM generated_videos
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
                let storyboard_id: Uuid = row.try_get("storyboard_id").map_err(|e| Status::internal(format!("Failed to parse storyboard_id: {}", e)))?;
                let variation_number: i32 = row.try_get("variation_number").map_err(|e| Status::internal(format!("Failed to parse variation_number: {}", e)))?;
                let video_url: Option<String> = row.try_get("video_url").ok();
                let video_data: Option<Vec<u8>> = row.try_get("video_data").ok();
                let status: String = row.try_get("status").map_err(|e| Status::internal(format!("Failed to parse status: {}", e)))?;
                let openai_job_id: Option<String> = row.try_get("openai_job_id").ok();
                let error_message: Option<String> = row.try_get("error_message").ok();
                let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

                let video_data_base64 = video_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

                Ok(Response::new(VideoStatus {
                    id: id.to_string(),
                    storyboard_id: storyboard_id.to_string(),
                    variation_number,
                    video_url,
                    video_data: video_data_base64,
                    status,
                    openai_job_id,
                    error_message,
                    created_at: created_at.to_rfc3339(),
                    updated_at: updated_at.to_rfc3339(),
                }))
            }
            None => Err(Status::not_found("Video not found")),
        }
    }

    async fn list_generated_videos(
        &self,
        request: Request<ListGeneratedVideosRequest>,
    ) -> Result<Response<ListGeneratedVideosResponse>, Status> {
        let req = request.into_inner();
        let storyboard_id = req.storyboard_id;
        if storyboard_id.is_empty() {
            return Err(Status::invalid_argument("Storyboard ID is required"));
        }
        let storyboard_uuid = Uuid::parse_str(&storyboard_id)
            .map_err(uuid_error_to_status)?;

        let rows = sqlx::query(
            r#"
            SELECT id, storyboard_id, variation_number, video_url, video_data, status, openai_job_id, error_message, created_at, updated_at
            FROM generated_videos
            WHERE storyboard_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_all(self.pool.as_ref())
        .await
        .map_err(sqlx_error_to_status)?;

        let mut videos = Vec::new();
        for row in rows {
            let id: Uuid = row.try_get("id").map_err(|e| Status::internal(format!("Failed to parse id: {}", e)))?;
            let storyboard_id_db: Uuid = row.try_get("storyboard_id").map_err(|e| Status::internal(format!("Failed to parse storyboard_id: {}", e)))?;
            let variation_number: i32 = row.try_get("variation_number").map_err(|e| Status::internal(format!("Failed to parse variation_number: {}", e)))?;
            let video_url: Option<String> = row.try_get("video_url").ok();
            let video_data: Option<Vec<u8>> = row.try_get("video_data").ok();
            let status: String = row.try_get("status").map_err(|e| Status::internal(format!("Failed to parse status: {}", e)))?;
            let openai_job_id: Option<String> = row.try_get("openai_job_id").ok();
            let error_message: Option<String> = row.try_get("error_message").ok();
            let created_at: chrono::DateTime<chrono::Utc> = row.try_get("created_at").map_err(|e| Status::internal(format!("Failed to parse created_at: {}", e)))?;
            let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at").map_err(|e| Status::internal(format!("Failed to parse updated_at: {}", e)))?;

            let video_data_base64 = video_data.as_ref().map(|bytes| general_purpose::STANDARD.encode(bytes));

            videos.push(VideoStatus {
                id: id.to_string(),
                storyboard_id: storyboard_id_db.to_string(),
                variation_number,
                video_url,
                video_data: video_data_base64,
                status,
                openai_job_id,
                error_message,
                created_at: created_at.to_rfc3339(),
                updated_at: updated_at.to_rfc3339(),
            });
        }

        Ok(Response::new(ListGeneratedVideosResponse { videos }))
    }
}

// Helper struct for scene data (used in OpenAI service)
#[derive(Debug, Clone)]
pub struct SceneData {
    pub text_description: Option<String>,
}
