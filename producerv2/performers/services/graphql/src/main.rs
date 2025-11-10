/**
 * GraphQL Service Main
 * Rust async-graphqlサービス
 */

use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    extract::Extension,
    http::Method,
    response::Html,
    routing::get,
    Router,
};
use tower_http::cors::{Any, CorsLayer};

mod schema;

use schema::QueryRoot;

async fn graphql_handler(
    Extension(schema): Extension<Schema<QueryRoot, EmptyMutation, EmptySubscription>>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

async fn graphql_playground() -> Html<String> {
    Html(async_graphql::http::playground_source(
        async_graphql::http::GraphQLPlaygroundConfig::new("/graphql"),
    ))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let schema = Schema::build(QueryRoot::default(), EmptyMutation, EmptySubscription)
        .finish();

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any)
        .allow_origin(Any);

    let app = Router::new()
        .route("/graphql", get(graphql_playground).post(graphql_handler))
        .layer(Extension(schema))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("GraphQL server running on http://0.0.0.0:8080/graphql");
    axum::serve(listener, app).await?;

    Ok(())
}

