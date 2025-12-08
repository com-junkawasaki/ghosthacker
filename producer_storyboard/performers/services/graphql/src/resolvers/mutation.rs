/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/storyboard-mutations
 * 
 * GraphQL Mutation resolvers
 */
use async_graphql::{Context, Object, ID, Result};
use crate::ports::postgres::PostgresPool;
use crate::schema::storyboard::VideoStatus;
use uuid::Uuid;

#[derive(Default)]
pub struct MutationRoot;

#[Object]
impl MutationRoot {
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
