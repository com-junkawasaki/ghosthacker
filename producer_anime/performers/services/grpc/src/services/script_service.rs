use tonic::{Request, Response, Status};
use prost_types::Timestamp;
use chrono::{DateTime, Utc};
use nanoid::nanoid;

use producerv2_grpc_web::database::client::{get_script, create_script, update_script, delete_script};
use producerv2_grpc_web::database::schema::Script as DatabaseScript;

pub mod proto {
    pub mod common {
        tonic::include_proto!("producer.common");
    }
    tonic::include_proto!("producer");
}

use proto::{
    script_service_server::ScriptService,
    GetScriptRequest, GetScriptResponse,
    CreateScriptRequest, CreateScriptResponse,
    UpdateScriptRequest, UpdateScriptResponse,
    DeleteScriptRequest, DeleteScriptResponse,
    Script,
};

fn chrono_to_prost(dt: DateTime<Utc>) -> Timestamp {
    Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

fn database_to_proto(db: DatabaseScript) -> Script {
    Script {
        id: db.id,
        script_text: db.script_text,
        derived_from_story: db.derived_from_story,
        status: db.status,
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

#[derive(Default)]
pub struct ScriptServiceImpl;

#[tonic::async_trait]
impl ScriptService for ScriptServiceImpl {
    async fn get_script(
        &self,
        request: Request<GetScriptRequest>,
    ) -> Result<Response<GetScriptResponse>, Status> {
        let req = request.into_inner();
        match get_script(&req.id).await {
            Ok(Some(script)) => Ok(Response::new(GetScriptResponse {
                script: Some(database_to_proto(script)),
            })),
            Ok(None) => Ok(Response::new(GetScriptResponse { script: None })),
            Err(e) => Err(Status::internal(format!("Failed to get script: {}", e))),
        }
    }

    async fn create_script(
        &self,
        request: Request<CreateScriptRequest>,
    ) -> Result<Response<CreateScriptResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let script_id = format!("Script_{}", nanoid!());

        let script = DatabaseScript {
            id: script_id.clone(),
            script_text: req.script_text,
            derived_from_story: req.derived_from_story,
            status: req.status,
            created_at: now,
            updated_at: now,
        };

        match create_script(&script).await {
            Ok(_) => Ok(Response::new(CreateScriptResponse {
                script: Some(database_to_proto(script)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create script: {}", e))),
        }
    }

    async fn update_script(
        &self,
        request: Request<UpdateScriptRequest>,
    ) -> Result<Response<UpdateScriptResponse>, Status> {
        let req = request.into_inner();
        let mut script = get_script(&req.id).await
            .map_err(|e| Status::not_found(format!("Script not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("Script not found: {}", req.id)))?;

        if let Some(script_text) = req.script_text {
            script.script_text = script_text;
        }
        if let Some(status) = req.status {
            script.status = status;
        }
        script.updated_at = Utc::now();

        match update_script(&script).await {
            Ok(_) => Ok(Response::new(UpdateScriptResponse {
                script: Some(database_to_proto(script)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update script: {}", e))),
        }
    }

    async fn delete_script(
        &self,
        request: Request<DeleteScriptRequest>,
    ) -> Result<Response<DeleteScriptResponse>, Status> {
        let req = request.into_inner();
        match delete_script(&req.id).await {
            Ok(_) => Ok(Response::new(DeleteScriptResponse { success: true })),
            Err(e) => Err(Status::internal(format!("Failed to delete script: {}", e))),
        }
    }
}

