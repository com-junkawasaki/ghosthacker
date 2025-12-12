-- name: ListGeneratedVideos :many
SELECT id, storyboard_id, variation_number, video_url, status, error_message, created_at
FROM generated_videos
WHERE storyboard_id = $1
ORDER BY variation_number ASC, created_at DESC;

-- name: GetGeneratedVideo :one
SELECT id, storyboard_id, variation_number, video_url, status, error_message, created_at
FROM generated_videos
WHERE id = $1;

-- name: CreateGeneratedVideo :one
INSERT INTO generated_videos (storyboard_id, variation_number, status, org_id)
VALUES ($1, $2, $3, $4)
RETURNING id, storyboard_id, variation_number, video_url, status, error_message, created_at;

-- name: UpdateGeneratedVideoStatus :one
UPDATE generated_videos
SET status = $2,
    video_url = $3,
    error_message = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING id, storyboard_id, variation_number, video_url, status, error_message, created_at;

-- name: DeleteGeneratedVideo :exec
DELETE FROM generated_videos WHERE id = $1;
