/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/graphql
 * 
 * GraphQL API service for EPUB Editor Tool
 * Provides Query, Mutation, and Subscription operations for EPUB editing
 */
use async_graphql::{EmptySubscription, Schema};
use async_graphql_poem::{GraphQL, GraphQLSubscription};
use poem::{listener::TcpListener, Route, Server};

mod schema;
mod resolvers;
mod ports;

use resolvers::query::QueryRoot;
use resolvers::mutation::MutationRoot;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize Neo4j connection
    let neo4j_pool = ports::neo4j::create_pool().await?;
    
    // Create GraphQL schema
    let schema = Schema::build(
        QueryRoot::default(),
        MutationRoot::default(),
        EmptySubscription,
    )
    .data(neo4j_pool)
    .finish();
    
    // Create routes
    let app = Route::new()
        .at("/graphql", GraphQL::new(schema.clone()))
        .at("/graphql/ws", GraphQLSubscription::new(schema));
    
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

