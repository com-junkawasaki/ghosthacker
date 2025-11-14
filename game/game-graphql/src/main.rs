/**
 * Game GraphQL Service Main
 * ゲーム専用GraphQLサービス
 * 
 * @context {
 *   "@id": "ex:GameGraphQL",
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
mod terminusdb;
mod hume;

use schema::{MutationRoot, QueryRoot};
use async_graphql::EmptySubscription;

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

    // TerminusDBクライアントを初期化
    terminusdb::client::initialize().await?;

    // OWLスキーマ適用
    terminusdb::schema::apply_owl_schema().await?;

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
    tracing::info!("Game GraphQL server running on http://0.0.0.0:8080/graphql");
    Server::new(listener).run(app).await?;

    Ok(())
}

