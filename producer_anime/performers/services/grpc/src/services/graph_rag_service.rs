use tonic::{Request, Response, Status};

use producerv2_graphql::graph::rag::get_rag_service;

pub mod proto {
    tonic::include_proto!("producer.graph");
}

use proto::{
    graph_rag_service_server::GraphRagService,
    GraphRagQueryRequest, GraphRagQueryResponse,
};

#[derive(Default)]
pub struct GraphRagServiceImpl;

#[tonic::async_trait]
impl GraphRagService for GraphRagServiceImpl {
    async fn query(
        &self,
        request: Request<GraphRagQueryRequest>,
    ) -> Result<Response<GraphRagQueryResponse>, Status> {
        let req = request.into_inner();
        let rag_service = get_rag_service()
            .map_err(|e| Status::internal(format!("RAG service error: {}", e)))?;
        
        match rag_service.query(&req.query, req.project_id.as_deref()).await {
            Ok(response) => Ok(Response::new(GraphRagQueryResponse { response })),
            Err(e) => Err(Status::internal(format!("Graph RAG query failed: {}", e))),
        }
    }
}

