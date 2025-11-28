use async_graphql::{EmptySubscription, Schema};
use async_graphql_warp::GraphQLResponse;
use std::convert::Infallible;
use warp::{Filter, Reply};
use tracing_subscriber;

mod schema;
mod activities;
mod infra;

use schema::{QueryRoot, MutationRoot};
use infra::database::get_db_connection;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenv::dotenv().ok();

    // Create database connection pool
    let pool = get_db_connection().expect("Failed to create database connection pool");

    // Create GraphQL schema
    let schema = Schema::build(QueryRoot::default(), MutationRoot::default(), EmptySubscription)
        .data(pool)
        .finish();

    // CORS configuration
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type", "authorization"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    // GraphQL endpoint
    let graphql_route = warp::path("graphql")
        .and(warp::post())
        .and(async_graphql_warp::graphql(schema))
        .and_then(|(schema, request): (Schema<QueryRoot, MutationRoot, EmptySubscription>, async_graphql::Request)| async move {
            Ok::<_, Infallible>(GraphQLResponse::from(schema.execute(request).await))
        });

    // GraphQL Playground (development only)
    let playground_route = warp::path("graphql")
        .and(warp::get())
        .and(async_graphql_warp::graphql_playground("/graphql", None));

    // Health check
    let health_route = warp::path("health")
        .and(warp::get())
        .map(|| "OK");

    let routes = graphql_route
        .or(playground_route)
        .or(health_route)
        .with(cors);

    println!("GraphQL server running on http://localhost:8080/graphql");
    warp::serve(routes).run(([0, 0, 0, 0], 8080)).await;
}

