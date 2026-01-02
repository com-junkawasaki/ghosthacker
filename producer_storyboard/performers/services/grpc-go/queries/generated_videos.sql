-- name: ListGeneratedVideos :many
SELECT id, storyboard_id, variation_number, video_url, status, error_message, created_at, provider, model, duration
FROM generated_videos
WHERE storyboard_id = $1
ORDER BY variation_number ASC, created_at DESC;

-- name: GetGeneratedVideo :one
SELECT id, storyboard_id, variation_number, video_url, status, error_message, created_at, provider, runway_task_id, model, duration, generation_params
FROM generated_videos
WHERE id = $1;

-- name: CreateGeneratedVideo :one
INSERT INTO generated_videos (storyboard_id, variation_number, status, org_id)
VALUES ($1, $2, $3, $4)
RETURNING id, storyboard_id, variation_number, video_url, status, error_message, created_at, provider, model, duration;

-- name: UpdateGeneratedVideoStatus :one
UPDATE generated_videos
SET status = $2,
    video_url = $3,
    error_message = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING id, storyboard_id, variation_number, video_url, status, error_message, created_at, provider, model, duration;

-- name: DeleteGeneratedVideo :exec
DELETE FROM generated_videos WHERE id = $1;

-- name: CreateGeneratedVideoRunway :one
INSERT INTO generated_videos (
    storyboard_id, 
    variation_number, 
    status, 
    org_id,
    provider,
    runway_task_id,
    model,
    duration,
    generation_params
)
VALUES ($1, $2, $3, $4, 'runway', $5, $6, $7, $8)
RETURNING id, storyboard_id, variation_number, status, provider, runway_task_id, model, duration, created_at, generation_params;

-- name: UpdateGeneratedVideoRunwayStatus :one
UPDATE generated_videos
SET status = $2,
    video_url = $3,
    video_data = $4,
    error_message = $5,
    updated_at = NOW()
WHERE runway_task_id = $1
RETURNING id, storyboard_id, variation_number, status, provider, runway_task_id, video_url, error_message, created_at, model, duration;

-- name: GetGeneratedVideoByRunwayTaskID :one
SELECT id, storyboard_id, variation_number, status, provider, runway_task_id, video_url, error_message, created_at, model, duration, generation_params
FROM generated_videos
WHERE runway_task_id = $1;

-- name: ListPendingRunwayVideos :many
SELECT id, storyboard_id, runway_task_id, status, created_at, model, duration
FROM generated_videos
WHERE provider = 'runway' 
  AND status IN ('pending', 'processing')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
