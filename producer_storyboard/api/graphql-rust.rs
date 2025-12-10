/**
 * Vercel Rust Runtime GraphQL Serverless Function
 * Uses existing GraphQL schema and resolvers from performers/services/graphql
 */
use async_graphql::{EmptySubscription, Schema, Variables};
use serde_json::json;
use storyboard_editor_graphql::resolvers::query::QueryRoot;
use storyboard_editor_graphql::resolvers::mutation::MutationRoot;
use storyboard_editor_graphql::ports::postgres::create_pool;
use storyboard_editor_graphql::ports::clerk::{ClerkAuth, ClerkOrg};
use tokio::sync::OnceCell;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};

// Global schema instance (initialized once)
static SCHEMA: OnceCell<Schema<QueryRoot, MutationRoot, EmptySubscription>> = OnceCell::const_new();

async fn get_schema() -> Result<&'static Schema<QueryRoot, MutationRoot, EmptySubscription>, Error> {
    Ok(SCHEMA.get_or_try_init(|| async {
        // Initialize PostgreSQL connection pool
        let postgres_pool = create_pool()
            .await
            .map_err(|e| Error::from(format!("Failed to create database pool: {}", e)))?;
        
        // Run migrations (only once on first initialization)
        // Note: In Vercel Serverless Functions, this will run on cold start
        sqlx::migrate!("./migrations")
            .run(postgres_pool.as_ref())
            .await
            .map_err(|e| Error::from(format!("Failed to run migrations: {}", e)))?;
        
        // Create GraphQL schema
        let schema = Schema::build(
            QueryRoot::default(),
            MutationRoot::default(),
            EmptySubscription,
        )
        .data(postgres_pool)
        .finish();
        
        Ok::<_, Error>(schema)
    })
    .await
    .map_err(|e| Error::from(format!("Failed to initialize schema: {:?}", e)))?)
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    // Handle CORS preflight
    if req.method() == "OPTIONS" {
        return Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Org-Id")
            .body(Body::Empty)?);
    }
    
    // Initialize schema if not already initialized
    let schema = get_schema().await?;
    
    // Parse request body
    let body_str = match req.body() {
        Body::Empty => return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header("Content-Type", "application/json")
            .body(json!({
                "error": "Request body is required"
            }).to_string().into())?),
        Body::Text(text) => text.clone(),
        Body::Binary(bytes) => String::from_utf8(bytes.to_vec())
            .map_err(|e| Error::from(format!("Invalid UTF-8 in body: {}", e)))?,
    };
    
    let body_json: serde_json::Value = serde_json::from_str(&body_str)
        .map_err(|e| Error::from(format!("Invalid JSON: {}", e)))?;
    
    // Extract GraphQL query, variables, and operation name
    let query = body_json.get("query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| Error::from("Missing 'query' field"))?;
    
    let variables = body_json.get("variables")
        .cloned()
        .unwrap_or(json!({}));
    
    let operation_name = body_json.get("operationName")
        .and_then(|v| v.as_str());
    
    // Create GraphQL request
    let mut graphql_request = async_graphql::Request::new(query);
    
    // Extract headers for Clerk authentication and create ClerkAuth context
    let mut clerk_auth = ClerkAuth::default();
    
    if let Some(auth_header) = req.headers().get("authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                clerk_auth.session_id = Some(token.to_string());
            } else {
                clerk_auth.session_id = Some(auth_str.to_string());
            }
        }
    }
    
    if let Some(org_id) = req.headers().get("x-org-id") {
        if let Ok(org_id_str) = org_id.to_str() {
            clerk_auth.org = Some(ClerkOrg {
                id: org_id_str.to_string(),
                name: None,
                slug: None,
            });
        }
    }
    
    // Add ClerkAuth to GraphQL request context
    graphql_request = graphql_request.data(clerk_auth);
    
    if !variables.is_null() {
        // Convert serde_json::Value to async_graphql::Variables
        let graphql_variables: Variables = serde_json::from_value(variables)
            .map_err(|e| Error::from(format!("Invalid variables format: {}", e)))?;
        graphql_request = graphql_request.variables(graphql_variables);
    }
    
    if let Some(op_name) = operation_name {
        graphql_request = graphql_request.operation_name(op_name);
    }
    
    // Execute GraphQL query
    let response = schema.execute(graphql_request).await;
    
    // Convert response to JSON
    let response_json = serde_json::to_string(&response)
        .map_err(|e| Error::from(format!("Failed to serialize response: {}", e)))?;
    
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(response_json.into())?)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}
