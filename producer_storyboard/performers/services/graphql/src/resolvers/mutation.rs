/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/storyboard-mutations
 * 
 * GraphQL Mutation resolvers
 */
use async_graphql::{Context, InputObject, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::schema::storyboard::{Project, VideoStatus};
use uuid::Uuid;

#[derive(InputObject)]
pub struct CreateProjectInput {
    pub title: String,
    pub description: Option<String>,
}

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Create a new project
    async fn create_project(&self, ctx: &Context<'_>, input: CreateProjectInput) -> Result<Project> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO storyboard_projects (id, title, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            "#,
        )
        .bind(id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create project: {}", e)))?;
        
        Ok(Project {
            id: ID(id.to_string()),
            title: input.title,
            description: input.description,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        })
    }

    /// Generate a video for a storyboard
    async fn generate_video(&self, ctx: &Context<'_>, storyboard_id: ID) -> Result<VideoStatus> {
        let pool = ctx.data::<PostgresPool>()?;
        
        let storyboard_uuid = Uuid::parse_str(&storyboard_id.0)
            .map_err(|e| async_graphql::Error::new(format!("Invalid storyboard ID: {}", e)))?;
        
        // Get the next variation number
        let variation_row = sqlx::query_as::<_, (Option<i32>,)>(
            r#"
            SELECT MAX(variation_number) + 1
            FROM generated_videos
            WHERE storyboard_id = $1
            "#,
        )
        .bind(storyboard_uuid)
        .fetch_optional(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to get variation number: {}", e)))?;
        
        let variation_number = variation_row
            .and_then(|row| row.0)
            .unwrap_or(1);
        
        // Create a new video generation record
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        
        sqlx::query(
            r#"
            INSERT INTO generated_videos (id, storyboard_id, variation_number, status, created_at, updated_at)
            VALUES ($1, $2, $3, 'pending', $4, $4)
            "#,
        )
        .bind(id)
        .bind(storyboard_uuid)
        .bind(variation_number)
        .bind(now)
        .execute(pool.as_ref())
        .await
        .map_err(|e| async_graphql::Error::new(format!("Failed to create video generation record: {}", e)))?;
        
        Ok(VideoStatus {
            id: ID(id.to_string()),
            storyboard_id,
            variation_number,
            video_url: None,
            status: "pending".to_string(),
            error_message: None,
            created_at: now.to_rfc3339(),
        })
    }
}
