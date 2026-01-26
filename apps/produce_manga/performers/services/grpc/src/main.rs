/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/grpc
 * 
 * gRPC API service for Manga Editor Tool
 * Provides gRPC operations for manga editing
 * Uses PostgreSQL database with sqlx for data persistence
 * Supports both gRPC and gRPC-Web protocols
 */
use manga_editor_grpc::ports::postgres::create_pool;
use manga_editor_grpc::service::manga_editor::MangaEditorServiceImpl;
use manga_editor_grpc::service::manga_editor::proto::manga_editor_service_server::MangaEditorServiceServer;
use tonic::transport::Server;
use tower::ServiceBuilder;
use tower_http::cors::{CorsLayer, Any};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize PostgreSQL connection
    let postgres_pool = create_pool().await?;
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(postgres_pool.as_ref())
        .await?;
    
    // Create gRPC service
    let manga_editor_service = MangaEditorServiceImpl::new(postgres_pool);
    
    // Get server configuration
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;
    let host = std::env::var("HOST")
        .unwrap_or_else(|_| "0.0.0.0".to_string());
    
    let addr = format!("{}:{}", host, port).parse()?;
    
    println!("gRPC server running on http://{}", addr);
    println!("gRPC endpoint: http://{}:{}/manga_editor.MangaEditorService", host, port);
    println!("gRPC-Web endpoint: http://{}:{}/manga_editor.MangaEditorService", host, port);
    
    // Create gRPC-Web service with CORS
    let grpc_web_service = tonic_web::enable(MangaEditorServiceServer::new(manga_editor_service));
    
    // Build and start server with CORS for gRPC-Web
    Server::builder()
        .accept_http1(true) // Enable HTTP/1.1 for gRPC-Web
        .layer(
            ServiceBuilder::new()
                .layer(CorsLayer::new()
                    .allow_origin(Any)
                    .allow_methods(Any)
                    .allow_headers(Any)
                    .expose_headers(Any))
        )
        .add_service(grpc_web_service)
        .serve(addr)
        .await?;
    
    Ok(())
}

