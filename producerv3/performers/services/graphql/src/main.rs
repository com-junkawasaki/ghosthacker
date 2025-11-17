/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/graphql
 * 
 * GraphQL API service for EPUB Editor Tool
 * Provides Query, Mutation, and Subscription operations for EPUB editing
 * Uses PostgreSQL database with sqlx for data persistence
 */
use async_graphql::{EmptySubscription, Schema};
use async_graphql_poem::GraphQL;
use poem::{
    listener::TcpListener,
    middleware::Cors,
    EndpointExt, Route, Server,
};

use epub_editor_graphql::resolvers::query::QueryRoot;
use epub_editor_graphql::resolvers::mutation::MutationRoot;
use epub_editor_graphql::ports;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize PostgreSQL connection
    let postgres_pool = epub_editor_graphql::ports::postgres::create_pool().await?;
    
    // Ensure default EPUB exists (for "default" project ID)
    let default_epub_id = "00000000-0000-0000-0000-000000000000";
    epub_editor_graphql::ports::postgres::ensure_default_epub(&postgres_pool, default_epub_id).await?;
    
    // Create GraphQL schema
    let schema = Schema::build(
        QueryRoot::default(),
        MutationRoot::default(),
        EmptySubscription,
    )
    .data(postgres_pool)
    .finish();
    
    // Create routes using GraphQL endpoint with CORS
    let app = Route::new()
        .nest("/graphql", GraphQL::new(schema))
        .with(Cors::new());
    
    // Start server
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse::<u16>()?;
    let host = std::env::var("HOST")
        .unwrap_or_else(|_| "0.0.0.0".to_string());
    let listener = TcpListener::bind(format!("{}:{}", host, port));
    println!("GraphQL server starting on {}:{}", host, port);
    Server::new(listener).run(app).await?;
    
    Ok(())
}

