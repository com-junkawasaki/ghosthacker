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
use async_graphql_poem::GraphQLRequest;
use poem::{
    handler,
    listener::TcpListener,
    middleware::Cors,
    web::{Data, Json},
    EndpointExt, Route, Server, post,
};

use storyboard_editor_graphql::resolvers::query::QueryRoot;
use storyboard_editor_graphql::resolvers::mutation::MutationRoot;
use storyboard_editor_graphql::ports::clerk::extract_clerk_auth;

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
    
    // Create custom GraphQL handler that extracts headers and adds them to context
    #[handler]
    async fn graphql_handler(
        req: &poem::Request,
        graphql_req: GraphQLRequest,
        schema: Data<&Schema<QueryRoot, MutationRoot, EmptySubscription>>,
    ) -> Json<async_graphql::Response> {
        // Extract headers from request
        let headers = req.headers();
        
        // Extract Clerk authentication from headers
        let clerk_auth = extract_clerk_auth(headers);
        
        // Create a new GraphQL request with headers and auth in context
        let mut request = graphql_req.0;
        request = request.data(headers.clone());
        request = request.data(clerk_auth);
        
        // Execute the GraphQL request
        let response = schema.execute(request).await;
        Json(response)
    }
    
    // Create routes using custom GraphQL handler with CORS
    let app = Route::new()
        .at("/graphql", post(graphql_handler).data(schema))
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
