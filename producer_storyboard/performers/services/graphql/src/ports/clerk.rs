/**
 * Clerk authentication integration
 * Provides user and organization context for GraphQL resolvers
 */
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Clerk user information extracted from JWT token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClerkUser {
    pub id: String,
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

/// Clerk organization information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClerkOrg {
    pub id: String,
    pub name: Option<String>,
    pub slug: Option<String>,
}

/// Clerk authentication context
#[derive(Debug, Clone)]
pub struct ClerkAuth {
    pub user: Option<ClerkUser>,
    pub org: Option<ClerkOrg>,
    pub session_id: Option<String>,
}

impl Default for ClerkAuth {
    fn default() -> Self {
        Self {
            user: None,
            org: None,
            session_id: None,
        }
    }
}

/// Extract Clerk authentication from request headers
pub fn extract_clerk_auth(headers: &poem::http::HeaderMap) -> ClerkAuth {
    let mut auth = ClerkAuth::default();
    
    // Extract session ID from Authorization header or X-Clerk-Session header
    if let Some(auth_header) = headers.get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                auth.session_id = Some(token.to_string());
            }
        }
    }
    
    if auth.session_id.is_none() {
        if let Some(session_header) = headers.get("X-Clerk-Session") {
            if let Ok(session_str) = session_header.to_str() {
                auth.session_id = Some(session_str.to_string());
            }
        }
    }
    
    // Extract org ID from X-Org-Id header
    if let Some(org_header) = headers.get("X-Org-Id") {
        if let Ok(org_id) = org_header.to_str() {
            auth.org = Some(ClerkOrg {
                id: org_id.to_string(),
                name: None,
                slug: None,
            });
        }
    }
    
    auth
}

/// Helper function to get Clerk auth from GraphQL context
pub fn get_clerk_auth_from_context(ctx: &async_graphql::Context<'_>) -> async_graphql::Result<ClerkAuth> {
    ctx.data::<ClerkAuth>()
        .map(|auth| auth.clone())
        .map_err(|_| async_graphql::Error::new("Clerk authentication not available"))
}

/// Require authentication - returns error if user is not authenticated
pub fn require_auth(ctx: &async_graphql::Context<'_>) -> async_graphql::Result<ClerkUser> {
    let auth = get_clerk_auth_from_context(ctx)?;
    auth.user.ok_or_else(|| async_graphql::Error::new("Authentication required"))
}

/// Require organization context - returns error if user is not in an organization
pub fn require_org(ctx: &async_graphql::Context<'_>) -> async_graphql::Result<ClerkOrg> {
    let auth = get_clerk_auth_from_context(ctx)?;
    auth.org.ok_or_else(|| async_graphql::Error::new("Organization context required"))
}

/// Require both authentication and organization context
pub fn require_auth_and_org(ctx: &async_graphql::Context<'_>) -> async_graphql::Result<(ClerkUser, ClerkOrg)> {
    let auth = get_clerk_auth_from_context(ctx)?;
    let user = auth.user.ok_or_else(|| async_graphql::Error::new("Authentication required"))?;
    let org = auth.org.ok_or_else(|| async_graphql::Error::new("Organization context required"))?;
    Ok((user, org))
}
