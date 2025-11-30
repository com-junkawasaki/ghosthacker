/**
 * GraphQL Service Main
 * Rust async-graphqlサービス with Poem
 * 
 * @context {
 *   "@id": "ex:GraphQLServiceMain",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphQLAPI"
 * }
 */

use async_graphql::Schema;
use async_graphql_poem::GraphQL;
use poem::{
    handler,
    http::StatusCode,
    listener::TcpListener,
    middleware::Cors,
    web::Html,
    EndpointExt, Route, Server,
};

mod schema;
mod database;
mod graph;
mod validation;

use schema::{MutationRoot, QueryRoot};
use async_graphql::EmptySubscription;
use graph::postgres::initialize as initialize_postgres_graph;
use graph::embedding::initialize as initialize_embedding;
use graph::rag::initialize as initialize_rag;

#[handler]
async fn graphql_playground() -> Html<String> {
    Html(async_graphql::http::playground_source(
        async_graphql::http::GraphQLPlaygroundConfig::new("/graphql"),
    ))
}

#[handler]
async fn health() -> (StatusCode, &'static str) {
    (StatusCode::OK, "OK")
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();
    tracing_subscriber::fmt::init();

    // PostgreSQL データベースクライアントを初期化
    database::client::initialize().await?;

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

    // GraphQLスキーマを構築
    let schema = Schema::build(
        QueryRoot::default(),
        MutationRoot::default(),
        EmptySubscription,
    )
    .finish();

    // Poemルートを設定
    let app = Route::new()
        .at("/graphql", GraphQL::new(schema))
        .at("/graphql-playground", graphql_playground)
        .at("/health", health)
        .with(Cors::new());

    let listener = TcpListener::bind("0.0.0.0:8080");
    tracing::info!("GraphQL server running on http://0.0.0.0:8080/graphql");
    Server::new(listener).run(app).await?;

    Ok(())
}

