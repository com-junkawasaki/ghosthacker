/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/graphql
 * 
 * GraphQL API service for Storyboard Editor Tool
 * Provides Query and Mutation operations for storyboard editing
 * Uses PostgreSQL database with sqlx for data persistence
 * Integrates Clerk authentication for user and organization management
 */
use async_graphql::{EmptySubscription, Schema};
use async_graphql_poem::GraphQL;
use poem::{
    listener::TcpListener,
    middleware::Cors,
    EndpointExt, Route, Server,
    Request, Result as PoemResult,
};

use storyboard_editor_graphql::resolvers::query::QueryRoot;
use storyboard_editor_graphql::resolvers::mutation::MutationRoot;
use storyboard_editor_graphql::ports;
use storyboard_editor_graphql::ports::clerk::{extract_clerk_auth, ClerkAuth};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize PostgreSQL connection
    let postgres_pool = storyboard_editor_graphql::ports::postgres::create_pool().await?;
    
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
    
    // Create GraphQL endpoint
    let graphql_endpoint = GraphQL::new(schema);
    
    // Wrap GraphQL endpoint with Clerk authentication middleware
    let graphql_with_auth = graphql_endpoint.data_fn(|req: &Request| {
        // Extract Clerk authentication from request headers
        let clerk_auth = extract_clerk_auth(req.headers());
        async_graphql::Data(clerk_auth)
    });
    
    // Create routes using GraphQL endpoint with CORS
    let app = Route::new()
        .nest("/graphql", graphql_with_auth)
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
