use tonic::{Request, Response, Status};
use prost_types::Timestamp;
use chrono::{DateTime, Utc};
use nanoid::nanoid;

use producerv2_grpc_web::database::client::{get_project, get_all_projects, create_project, update_project, delete_project};
use producerv2_grpc_web::database::schema::Project as DatabaseProject;

// protoファイルから生成されたコードをインポート
pub mod proto {
    // commonモジュールを先に定義（producer.protoが依存）
    pub mod common {
        tonic::include_proto!("producer.common");
    }
    tonic::include_proto!("producer");
}

use proto::{
    project_service_server::ProjectService,
    GetProjectRequest, GetProjectResponse,
    ListProjectsRequest, ListProjectsResponse,
    CreateProjectRequest, CreateProjectResponse,
    UpdateProjectRequest, UpdateProjectResponse,
    DeleteProjectRequest, DeleteProjectResponse,
    Project,
};

// タイムスタンプ変換ヘルパー
fn chrono_to_prost(dt: DateTime<Utc>) -> Timestamp {
    Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

fn prost_to_chrono(ts: Timestamp) -> DateTime<Utc> {
    DateTime::from_timestamp(ts.seconds, ts.nanos as u32)
        .unwrap_or_else(|| Utc::now())
}

fn database_to_proto(db: DatabaseProject) -> Project {
    Project {
        id: db.id,
        name: db.name,
        author: db.author,
        description: db.description,
        status: db.status,
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

#[derive(Default)]
pub struct ProjectServiceImpl;

#[tonic::async_trait]
impl ProjectService for ProjectServiceImpl {
    async fn get_project(
        &self,
        request: Request<GetProjectRequest>,
    ) -> Result<Response<GetProjectResponse>, Status> {
        let req = request.into_inner();
        match get_project(&req.id).await {
            Ok(Some(project)) => Ok(Response::new(GetProjectResponse {
                project: Some(database_to_proto(project)),
            })),
            Ok(None) => Ok(Response::new(GetProjectResponse { project: None })),
            Err(e) => Err(Status::internal(format!("Failed to get project: {}", e))),
        }
    }

    async fn list_projects(
        &self,
        request: Request<ListProjectsRequest>,
    ) -> Result<Response<ListProjectsResponse>, Status> {
        let _req = request.into_inner();
        match get_all_projects().await {
            Ok(projects) => {
                let projects_vec: Vec<DatabaseProject> = projects;
                let proto_projects: Vec<Project> = projects_vec
                    .into_iter()
                    .map(database_to_proto)
                    .collect();
                Ok(Response::new(ListProjectsResponse {
                    projects: proto_projects,
                    pagination: None, // TODO: ページネーション実装
                }))
            }
            Err(e) => Err(Status::internal(format!("Failed to list projects: {}", e))),
        }
    }

    async fn create_project(
        &self,
        request: Request<CreateProjectRequest>,
    ) -> Result<Response<CreateProjectResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let project_id = format!("Project_{}", nanoid!());

        let project = DatabaseProject {
            id: project_id.clone(),
            name: req.name,
            author: None,
            description: req.description,
            status: Some("active".to_string()),
            created_at: now,
            updated_at: now,
        };

        match create_project(&project).await {
            Ok(_) => Ok(Response::new(CreateProjectResponse {
                project: Some(database_to_proto(project)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create project: {}", e))),
        }
    }

    async fn update_project(
        &self,
        request: Request<UpdateProjectRequest>,
    ) -> Result<Response<UpdateProjectResponse>, Status> {
        let req = request.into_inner();
        let mut project: DatabaseProject = get_project(&req.id).await
            .map_err(|e| Status::not_found(format!("Project not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("Project not found: {}", req.id)))?;

        if let Some(name) = req.name {
            project.name = name;
        }
        if let Some(description) = req.description {
            project.description = Some(description);
        }
        if let Some(status) = req.status {
            project.status = Some(status);
        }
        project.updated_at = Utc::now();

        match update_project(&project).await {
            Ok(_) => Ok(Response::new(UpdateProjectResponse {
                project: Some(database_to_proto(project)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update project: {}", e))),
        }
    }

    async fn delete_project(
        &self,
        request: Request<DeleteProjectRequest>,
    ) -> Result<Response<DeleteProjectResponse>, Status> {
        let req = request.into_inner();
        match delete_project(&req.id).await {
            Ok(_) => Ok(Response::new(DeleteProjectResponse { success: true })),
            Err(e) => Err(Status::internal(format!("Failed to delete project: {}", e))),
        }
    }
}

