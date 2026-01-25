-- name: ListStoryboards :many
SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at
FROM storyboards
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetStoryboard :one
SELECT id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at
FROM storyboards
WHERE id = $1;

-- name: CreateStoryboard :one
INSERT INTO storyboards (project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, org_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at;

-- name: UpdateStoryboard :one
UPDATE storyboards
SET title = COALESCE($2, title),
    aspect_ratio = COALESCE($3, aspect_ratio),
    resolution = COALESCE($4, resolution),
    duration_seconds = COALESCE($5, duration_seconds),
    num_variations = COALESCE($6, num_variations),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, title, aspect_ratio, resolution, duration_seconds, num_variations, created_at, updated_at;

-- name: DeleteStoryboard :exec
DELETE FROM storyboards WHERE id = $1;
