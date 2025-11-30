use tonic::{Request, Response, Status};
use prost_types::Timestamp;
use chrono::{DateTime, Utc};
use nanoid::nanoid;

use producerv2_grpc_web::database::client::{get_story, get_all_stories, create_story, update_story, delete_story};
use producerv2_grpc_web::database::schema::Story as DatabaseStory;

pub mod proto {
    pub mod common {
        tonic::include_proto!("producer.common");
    }
    tonic::include_proto!("producer");
}

use proto::{
    story_service_server::StoryService,
    GetStoryRequest, GetStoryResponse,
    ListStoriesRequest, ListStoriesResponse,
    CreateStoryRequest, CreateStoryResponse,
    UpdateStoryRequest, UpdateStoryResponse,
    DeleteStoryRequest, DeleteStoryResponse,
    Story,
};

fn chrono_to_prost(dt: DateTime<Utc>) -> Timestamp {
    Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

fn database_to_proto(db: DatabaseStory) -> Story {
    Story {
        id: db.id,
        title: db.title,
        content: db.content,
        created_at: Some(chrono_to_prost(db.created_at)),
        updated_at: Some(chrono_to_prost(db.updated_at)),
    }
}

#[derive(Default)]
pub struct StoryServiceImpl;

#[tonic::async_trait]
impl StoryService for StoryServiceImpl {
    async fn get_story(
        &self,
        request: Request<GetStoryRequest>,
    ) -> Result<Response<GetStoryResponse>, Status> {
        let req = request.into_inner();
        match get_story(&req.id).await {
            Ok(Some(story)) => Ok(Response::new(GetStoryResponse {
                story: Some(database_to_proto(story)),
            })),
            Ok(None) => Ok(Response::new(GetStoryResponse { story: None })),
            Err(e) => Err(Status::internal(format!("Failed to get story: {}", e))),
        }
    }

    async fn list_stories(
        &self,
        request: Request<ListStoriesRequest>,
    ) -> Result<Response<ListStoriesResponse>, Status> {
        let _req = request.into_inner();
        match get_all_stories().await {
            Ok(stories) => {
                let stories_vec: Vec<DatabaseStory> = stories;
                let proto_stories: Vec<Story> = stories_vec
                    .into_iter()
                    .map(database_to_proto)
                    .collect();
                Ok(Response::new(ListStoriesResponse {
                    stories: proto_stories,
                    pagination: None,
                }))
            }
            Err(e) => Err(Status::internal(format!("Failed to list stories: {}", e))),
        }
    }

    async fn create_story(
        &self,
        request: Request<CreateStoryRequest>,
    ) -> Result<Response<CreateStoryResponse>, Status> {
        let req = request.into_inner();
        let now = Utc::now();
        let story_id = format!("Story_{}", nanoid!());

        let story = DatabaseStory {
            id: story_id.clone(),
            title: req.title,
            content: req.content,
            created_at: now,
            updated_at: now,
        };

        match create_story(&story).await {
            Ok(_) => Ok(Response::new(CreateStoryResponse {
                story: Some(database_to_proto(story)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to create story: {}", e))),
        }
    }

    async fn update_story(
        &self,
        request: Request<UpdateStoryRequest>,
    ) -> Result<Response<UpdateStoryResponse>, Status> {
        let req = request.into_inner();
        let mut story = get_story(&req.id).await
            .map_err(|e| Status::not_found(format!("Story not found: {}", e)))?
            .ok_or_else(|| Status::not_found(format!("Story not found: {}", req.id)))?;

        if let Some(title) = req.title {
            story.title = title;
        }
        if let Some(content) = req.content {
            story.content = content;
        }
        story.updated_at = Utc::now();

        match update_story(&story).await {
            Ok(_) => Ok(Response::new(UpdateStoryResponse {
                story: Some(database_to_proto(story)),
            })),
            Err(e) => Err(Status::internal(format!("Failed to update story: {}", e))),
        }
    }

    async fn delete_story(
        &self,
        request: Request<DeleteStoryRequest>,
    ) -> Result<Response<DeleteStoryResponse>, Status> {
        let req = request.into_inner();
        match delete_story(&req.id).await {
            Ok(_) => Ok(Response::new(DeleteStoryResponse { success: true })),
            Err(e) => Err(Status::internal(format!("Failed to delete story: {}", e))),
        }
    }
}

