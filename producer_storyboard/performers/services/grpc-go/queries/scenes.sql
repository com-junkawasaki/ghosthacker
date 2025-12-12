-- name: ListScenes :many
SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
       start_time_seconds, duration_seconds, transition_type, created_at, updated_at
FROM scenes
WHERE storyboard_id = $1
ORDER BY scene_number ASC;

-- name: GetScene :one
SELECT id, storyboard_id, scene_number, text_description, media_type, media_url,
       start_time_seconds, duration_seconds, transition_type, created_at, updated_at
FROM scenes
WHERE id = $1;

-- name: CreateScene :one
INSERT INTO scenes (storyboard_id, scene_number, text_description, media_type, transition_type, org_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, storyboard_id, scene_number, text_description, media_type, media_url,
          start_time_seconds, duration_seconds, transition_type, created_at, updated_at;

-- name: UpdateScene :one
UPDATE scenes
SET text_description = COALESCE($2, text_description),
    media_type = COALESCE($3, media_type),
    start_time_seconds = COALESCE($4, start_time_seconds),
    duration_seconds = COALESCE($5, duration_seconds),
    transition_type = COALESCE($6, transition_type),
    updated_at = NOW()
WHERE id = $1
RETURNING id, storyboard_id, scene_number, text_description, media_type, media_url,
          start_time_seconds, duration_seconds, transition_type, created_at, updated_at;

-- name: DeleteScene :exec
DELETE FROM scenes WHERE id = $1;

-- name: GetMaxSceneNumber :one
SELECT COALESCE(MAX(scene_number), 0) FROM scenes WHERE storyboard_id = $1;
