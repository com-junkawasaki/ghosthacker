use tonic::{Request, Response, Status};
use nanoid::nanoid;
use serde_json::Value as JsonValue;

use producerv2_graphql::graph::postgres::{get_client};
use producerv2_graphql::graph::jsonld::{JsonLdProcessor, GraphNodeData, GraphEdgeData};
use producerv2_graphql::graph::rag::SearchResult as DatabaseSearchResult;

// GraphNodeとGraphEdgeはprotoファイルから生成されたものを使用
type DatabaseGraphNode = producerv2_graphql::graph::postgres::GraphNode;
type DatabaseGraphEdge = producerv2_graphql::graph::postgres::GraphEdge;
type DatabaseVectorSearchResult = producerv2_graphql::graph::postgres::VectorSearchResult;

pub mod proto {
    tonic::include_proto!("producer.graph");
}

use proto::{
    graph_service_server::GraphService,
    GraphQueryRequest, GraphQueryResponse,
    GetGraphNodeRequest, GetGraphNodeResponse,
    GetGraphEdgeRequest, GetGraphEdgeResponse,
    CreateGraphNodeRequest, CreateGraphNodeResponse,
    UpdateGraphNodeRequest, UpdateGraphNodeResponse,
    DeleteGraphNodeRequest, DeleteGraphNodeResponse,
    CreateGraphEdgeRequest, CreateGraphEdgeResponse,
    DeleteGraphEdgeRequest, DeleteGraphEdgeResponse,
    SemanticSearchRequest, SemanticSearchResponse,
    VectorSearchRequest, VectorSearchResponse,
    ValidateJsonLdRequest, ValidateJsonLdResponse,
    ImportJsonLdRequest, ImportJsonLdResponse,
    ExportJsonLdRequest, ExportJsonLdResponse,
    ProcessGenerationRequest, ProcessGenerationResponse,
    GraphNode, GraphEdge, VectorSearchResult,
};

fn database_to_proto_node(db: DatabaseGraphNode) -> GraphNode {
    GraphNode {
        id: db.id.unwrap_or_default(),
        label: db.label,
        properties: serde_json::to_string(&db.properties).unwrap_or_default(),
        vector: db.vector.unwrap_or_default(),
        jsonld: serde_json::to_string(&db.jsonld).unwrap_or_default(),
    }
}

fn database_to_proto_edge(db: DatabaseGraphEdge) -> GraphEdge {
    GraphEdge {
        id: db.id.unwrap_or_default(),
        source: db.source,
        target: db.target,
        label: db.label,
        properties: serde_json::to_string(&db.properties).unwrap_or_default(),
    }
}

#[derive(Default)]
pub struct GraphServiceImpl;

#[tonic::async_trait]
impl GraphService for GraphServiceImpl {
    async fn graph_query(
        &self,
        request: Request<GraphQueryRequest>,
    ) -> Result<Response<GraphQueryResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        match client.query(&req.query).await {
            Ok(result) => {
                let result_str = serde_json::to_string(&result)
                    .map_err(|e| Status::internal(format!("Failed to serialize result: {}", e)))?;
                Ok(Response::new(GraphQueryResponse { result: result_str }))
            }
            Err(e) => Err(Status::internal(format!("Graph query failed: {}", e))),
        }
    }

    async fn get_graph_node(
        &self,
        request: Request<GetGraphNodeRequest>,
    ) -> Result<Response<GetGraphNodeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        match client.get_node(&req.id).await {
            Ok(Some(node)) => Ok(Response::new(GetGraphNodeResponse {
                node: Some(database_to_proto_node(node)),
            })),
            Ok(None) => Ok(Response::new(GetGraphNodeResponse { node: None })),
            Err(e) => Err(Status::internal(format!("Failed to get graph node: {}", e))),
        }
    }

    async fn get_graph_edge(
        &self,
        request: Request<GetGraphEdgeRequest>,
    ) -> Result<Response<GetGraphEdgeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        match client.get_edge(&req.id).await {
            Ok(Some(edge)) => Ok(Response::new(GetGraphEdgeResponse {
                edge: Some(database_to_proto_edge(edge)),
            })),
            Ok(None) => Ok(Response::new(GetGraphEdgeResponse { edge: None })),
            Err(e) => Err(Status::internal(format!("Failed to get graph edge: {}", e))),
        }
    }

    async fn create_graph_node(
        &self,
        request: Request<CreateGraphNodeRequest>,
    ) -> Result<Response<CreateGraphNodeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        let properties: JsonValue = serde_json::from_str(&req.properties)
            .map_err(|e| Status::invalid_argument(format!("Invalid properties JSON: {}", e)))?;
        let jsonld: JsonValue = serde_json::from_str(&req.jsonld)
            .map_err(|e| Status::invalid_argument(format!("Invalid jsonld JSON: {}", e)))?;
        
        let node = DatabaseGraphNode {
            id: req.id,
            label: req.label,
            properties,
            vector: if req.vector.is_empty() { None } else { Some(req.vector) },
            jsonld,
        };
        
        match client.create_node(&node).await {
            Ok(id) => Ok(Response::new(CreateGraphNodeResponse { id })),
            Err(e) => Err(Status::internal(format!("Failed to create graph node: {}", e))),
        }
    }

    async fn update_graph_node(
        &self,
        request: Request<UpdateGraphNodeRequest>,
    ) -> Result<Response<UpdateGraphNodeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        let properties: JsonValue = serde_json::from_str(&req.properties)
            .map_err(|e| Status::invalid_argument(format!("Invalid properties JSON: {}", e)))?;
        let jsonld: JsonValue = serde_json::from_str(&req.jsonld)
            .map_err(|e| Status::invalid_argument(format!("Invalid jsonld JSON: {}", e)))?;
        
        let node = DatabaseGraphNode {
            id: Some(req.id.clone()),
            label: req.label,
            properties,
            vector: if req.vector.is_empty() { None } else { Some(req.vector) },
            jsonld,
        };
        
        match client.update_node(&req.id, &node).await {
            Ok(_) => {
                let updated_node: DatabaseGraphNode = client.get_node(&req.id).await
                    .map_err(|e| Status::internal(format!("Failed to get updated node: {}", e)))?
                    .ok_or_else(|| Status::not_found("Node not found after update"))?;
                Ok(Response::new(UpdateGraphNodeResponse {
                    node: Some(database_to_proto_node(updated_node)),
                }))
            }
            Err(e) => Err(Status::internal(format!("Failed to update graph node: {}", e))),
        }
    }

    async fn delete_graph_node(
        &self,
        request: Request<DeleteGraphNodeRequest>,
    ) -> Result<Response<DeleteGraphNodeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        match client.delete_node(&req.id).await {
            Ok(_) => Ok(Response::new(DeleteGraphNodeResponse { success: true })),
            Err(e) => Err(Status::internal(format!("Failed to delete graph node: {}", e))),
        }
    }

    async fn create_graph_edge(
        &self,
        request: Request<CreateGraphEdgeRequest>,
    ) -> Result<Response<CreateGraphEdgeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        let properties: JsonValue = serde_json::from_str(&req.properties)
            .map_err(|e| Status::invalid_argument(format!("Invalid properties JSON: {}", e)))?;
        
        let edge = DatabaseGraphEdge {
            id: req.id,
            source: req.source,
            target: req.target,
            label: req.label,
            properties,
        };
        
        match client.create_edge(&edge).await {
            Ok(id) => Ok(Response::new(CreateGraphEdgeResponse { id })),
            Err(e) => Err(Status::internal(format!("Failed to create graph edge: {}", e))),
        }
    }

    async fn delete_graph_edge(
        &self,
        request: Request<DeleteGraphEdgeRequest>,
    ) -> Result<Response<DeleteGraphEdgeResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        match client.delete_edge(&req.id).await {
            Ok(_) => Ok(Response::new(DeleteGraphEdgeResponse { success: true })),
            Err(e) => Err(Status::internal(format!("Failed to delete graph edge: {}", e))),
        }
    }

    async fn semantic_search(
        &self,
        request: Request<SemanticSearchRequest>,
    ) -> Result<Response<SemanticSearchResponse>, Status> {
        let req = request.into_inner();
        let rag_service = producerv2_graphql::graph::rag::get_rag_service()
            .map_err(|e| Status::internal(format!("RAG service error: {}", e)))?;
        
        let limit = if req.limit > 0 { req.limit as usize } else { 10 };
        
        let search_results: Result<Vec<DatabaseSearchResult>, _> = rag_service.semantic_search(&req.query, limit).await;
        match search_results {
            Ok(results) => {
                let proto_results: Vec<VectorSearchResult> = results
                    .into_iter()
                    .map(|r| VectorSearchResult {
                        node_id: r.node_id,
                        label: r.label,
                        properties: serde_json::to_string(&r.properties).unwrap_or_default(),
                        score: r.score,
                    })
                    .collect();
                Ok(Response::new(SemanticSearchResponse { results: proto_results }))
            }
            Err(e) => Err(Status::internal(format!("Semantic search failed: {}", e))),
        }
    }

    async fn vector_search(
        &self,
        request: Request<VectorSearchRequest>,
    ) -> Result<Response<VectorSearchResponse>, Status> {
        let req = request.into_inner();
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        let limit = if req.limit > 0 { req.limit as usize } else { 10 };
        
        let vector_results: Result<Vec<DatabaseVectorSearchResult>, _> = client.vector_search(&req.query_vector, limit).await;
        match vector_results {
            Ok(results) => {
                let proto_results: Vec<VectorSearchResult> = results
                    .into_iter()
                    .filter_map(|r| {
                        r.node.as_ref().map(|node| VectorSearchResult {
                            node_id: r.node_id,
                            label: node.label.clone(),
                            properties: serde_json::to_string(&node.properties).unwrap_or_default(),
                            score: r.score,
                        })
                    })
                    .collect();
                Ok(Response::new(VectorSearchResponse { results: proto_results }))
            }
            Err(e) => Err(Status::internal(format!("Vector search failed: {}", e))),
        }
    }

    async fn validate_json_ld(
        &self,
        request: Request<ValidateJsonLdRequest>,
    ) -> Result<Response<ValidateJsonLdResponse>, Status> {
        let req = request.into_inner();
        let jsonld: JsonValue = serde_json::from_str(&req.jsonld)
            .map_err(|e| Status::invalid_argument(format!("Invalid JSON-LD: {}", e)))?;
        
        match JsonLdProcessor::validate(&jsonld) {
            Ok(_) => Ok(Response::new(ValidateJsonLdResponse {
                valid: true,
                error: None::<String>,
            })),
            Err(e) => Ok(Response::new(ValidateJsonLdResponse {
                valid: false,
                error: Some(e.to_string()),
            })),
        }
    }

    async fn import_json_ld(
        &self,
        request: Request<ImportJsonLdRequest>,
    ) -> Result<Response<ImportJsonLdResponse>, Status> {
        let req = request.into_inner();
        let jsonld: JsonValue = serde_json::from_str(&req.jsonld)
            .map_err(|e| Status::invalid_argument(format!("Invalid JSON-LD: {}", e)))?;
        
        // JSON-LDを検証
        JsonLdProcessor::validate(&jsonld)
            .map_err(|e| Status::invalid_argument(format!("Invalid JSON-LD: {}", e)))?;
        
        // JSON-LDからノードとエッジを抽出
        let (node_data_list, edge_data_list) = JsonLdProcessor::extract_graph_nodes_and_edges(&jsonld)
            .map_err(|e| Status::invalid_argument(format!("Failed to extract nodes and edges: {}", e)))?;
        
        let client = get_client()
            .map_err(|e| Status::internal(format!("PostgreSQL graph client error: {}", e)))?;
        
        let mut nodes_created = 0;
        let mut edges_created = 0;
        
        // ノードをインポート
        for node_data in node_data_list {
            let node = DatabaseGraphNode {
                id: Some(node_data.id.clone()),
                label: node_data.label,
                properties: node_data.properties,
                vector: None,
                jsonld: node_data.jsonld,
            };
            
            match client.create_node(&node).await {
                Ok(_) => nodes_created += 1,
                Err(e) => {
                    tracing::warn!("Failed to create node {}: {}", node_data.id, e);
                }
            }
        }
        
        // エッジをインポート
        for edge_data in edge_data_list {
            let mut edge_props = serde_json::Map::new();
            edge_props.insert("edgeType".to_string(), JsonValue::String(edge_data.edge_type));
            
            let edge = DatabaseGraphEdge {
                id: None,
                source: edge_data.source,
                target: edge_data.target,
                label: edge_data.label,
                properties: JsonValue::Object(edge_props),
            };
            
            match client.create_edge(&edge).await {
                Ok(_) => edges_created += 1,
                Err(e) => {
                    tracing::warn!("Failed to create edge {} -> {}: {}", edge.source, edge.target, e);
                }
            }
        }
        
        Ok(Response::new(ImportJsonLdResponse {
            nodes_created: nodes_created as i32,
            edges_created: edges_created as i32,
        }))
    }

    async fn export_json_ld(
        &self,
        request: Request<ExportJsonLdRequest>,
    ) -> Result<Response<ExportJsonLdResponse>, Status> {
        let _req = request.into_inner();
        // TODO: 実装（プロジェクトIDに基づいてグラフをエクスポート）
        Err(Status::unimplemented("Export JSON-LD not yet implemented"))
    }

    async fn execute_process_generation(
        &self,
        request: Request<ProcessGenerationRequest>,
    ) -> Result<Response<ProcessGenerationResponse>, Status> {
        let req = request.into_inner();
        // Process generationはNext.js API Routeで実装されているため、
        // ここでは簡易的な実装としてエラーを返す
        // 実際の実装は /api/grpc/graph/process/[id]/generate で行われる
        Err(Status::unimplemented("Process generation should be called via Next.js API route"))
    }
}

