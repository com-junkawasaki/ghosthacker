/**
 * gRPC Service Main
 * Rust tonic gRPCサービス
 */

use dotenv::dotenv;
use std::net::SocketAddr;
use tonic::transport::Server;
use tower::ServiceBuilder;
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber;

mod services;
use services::{
    ProjectServiceImpl, StoryServiceImpl, ScriptServiceImpl, DocumentServiceImpl,
    GraphServiceImpl, GraphRagServiceImpl,
};

use producerv2_grpc_web::database::client::initialize as initialize_database;
use producerv2_grpc_web::graph::postgres::initialize as initialize_postgres_graph;
use producerv2_grpc_web::graph::embedding::initialize as initialize_embedding;
use producerv2_grpc_web::graph::rag::initialize as initialize_rag;

// protoファイルから生成されたサービスサーバーをインポート
use services::project_service::proto::project_service_server::ProjectServiceServer;
use services::story_service::proto::story_service_server::StoryServiceServer;
use services::script_service::proto::script_service_server::ScriptServiceServer;
use services::document_service::proto::document_service_server::DocumentServiceServer;
use services::graph_service::proto::graph_service_server::GraphServiceServer;
use services::graph_rag_service::proto::graph_rag_service_server::GraphRagServiceServer;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    // PostgreSQL データベースクライアントを初期化
    initialize_database().await?;

    // PostgreSQLグラフクライアントを初期化
    initialize_postgres_graph().await?;

    // Embeddingサービスを初期化（オプショナル）
    if let Err(e) = initialize_embedding().await {
        tracing::warn!("Embedding service initialization failed (optional): {}", e);
    } else {
        tracing::info!("Embedding service initialized successfully");
    }

    // Graph RAGサービスを初期化（オプショナル）
    if let Err(e) = initialize_rag().await {
        tracing::warn!("Graph RAG service initialization failed (optional): {}", e);
    } else {
        tracing::info!("Graph RAG service initialized successfully");
    }

    let addr: SocketAddr = "0.0.0.0:50051".parse()?;
    tracing::info!("gRPC server listening on {} (gRPC + gRPC-Web)", addr);

    // サービス実装を構築
    let project_service = ProjectServiceServer::new(ProjectServiceImpl::default());
    let story_service = StoryServiceServer::new(StoryServiceImpl::default());
    let script_service = ScriptServiceServer::new(ScriptServiceImpl::default());
    let document_service = DocumentServiceServer::new(DocumentServiceImpl::default());
    let graph_service = GraphServiceServer::new(GraphServiceImpl::default());
    let graph_rag_service = GraphRagServiceServer::new(GraphRagServiceImpl::default());

    // gRPC-Web対応のためのサービスを有効化（CORSは後で追加）
    let project_service_web = tonic_web::enable(project_service);
    let story_service_web = tonic_web::enable(story_service);
    let script_service_web = tonic_web::enable(script_service);
    let document_service_web = tonic_web::enable(document_service);
    let graph_service_web = tonic_web::enable(graph_service);
    let graph_rag_service_web = tonic_web::enable(graph_rag_service);

    Server::builder()
        .accept_http1(true) // HTTP/1.1を有効化（gRPC-Web用）
        .add_service(project_service_web)
        .add_service(story_service_web)
        .add_service(script_service_web)
        .add_service(document_service_web)
        .add_service(graph_service_web)
        .add_service(graph_rag_service_web)
        .serve(addr)
        .await?;

    Ok(())
}

