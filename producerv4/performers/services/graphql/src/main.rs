/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/graphql
 * 
 * GraphQL API service for Manga Editor Tool
 * Provides Query and Mutation operations for manga editing
 * Uses PostgreSQL database with sqlx for data persistence
 */
use async_graphql::{EmptySubscription, Schema};
use async_graphql_poem::GraphQL;
use poem::{
    listener::TcpListener,
    middleware::Cors,
    EndpointExt, Route, Server,
};

use manga_editor_graphql::resolvers::query::QueryRoot;
use manga_editor_graphql::resolvers::mutation::MutationRoot;
use manga_editor_graphql::ports;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize PostgreSQL connection
    let postgres_pool = manga_editor_graphql::ports::postgres::create_pool().await?;
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(postgres_pool.as_ref())
        .await?;
    
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
    
    println!("GraphQL server running on http://{}:{}", host, port);
    println!("GraphQL endpoint: http://{}:{}/graphql", host, port);
    
    Server::new(TcpListener::bind(format!("{}:{}", host, port)))
        .run(app)
        .await?;
    
    Ok(())
}

