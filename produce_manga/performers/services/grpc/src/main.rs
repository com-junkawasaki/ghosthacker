/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/grpc
 * 
 * gRPC API service for Manga Editor Tool
 * Provides gRPC operations for manga editing
 * Uses PostgreSQL database with sqlx for data persistence
 */
use manga_editor_grpc::ports::postgres::create_pool;
use manga_editor_grpc::service::manga_editor::MangaEditorServiceImpl;
use manga_editor_grpc::service::manga_editor::proto::manga_editor_service_server::MangaEditorServiceServer;
use tonic::transport::Server;

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
    
    // Build and start server
    Server::builder()
        .add_service(MangaEditorServiceServer::new(manga_editor_service))
        .serve(addr)
        .await?;
    
    Ok(())
}

