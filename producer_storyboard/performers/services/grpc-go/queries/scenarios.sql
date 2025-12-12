-- name: ListScenarios :many
SELECT id, project_id, title, description, created_at, updated_at
FROM scenarios
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetScenario :one
SELECT id, project_id, title, description, created_at, updated_at
FROM scenarios
WHERE id = $1;

-- name: CreateScenario :one
INSERT INTO scenarios (project_id, title, description, org_id)
VALUES ($1, $2, $3, $4)
RETURNING id, project_id, title, description, created_at, updated_at;

-- name: UpdateScenario :one
UPDATE scenarios
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, title, description, created_at, updated_at;

-- name: DeleteScenario :exec
DELETE FROM scenarios WHERE id = $1;

-- name: ListEpisodes :many
SELECT id, scenario_id, title, description, order_index, created_at, updated_at
FROM episodes
WHERE scenario_id = $1
ORDER BY order_index ASC;

-- name: GetEpisode :one
SELECT id, scenario_id, title, description, order_index, created_at, updated_at
FROM episodes
WHERE id = $1;

-- name: CreateEpisode :one
INSERT INTO episodes (scenario_id, title, description, order_index, org_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, scenario_id, title, description, order_index, created_at, updated_at;

-- name: UpdateEpisode :one
UPDATE episodes
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    order_index = COALESCE($4, order_index),
    updated_at = NOW()
WHERE id = $1
RETURNING id, scenario_id, title, description, order_index, created_at, updated_at;

-- name: DeleteEpisode :exec
DELETE FROM episodes WHERE id = $1;

-- name: ListParts :many
SELECT id, episode_id, title, description, order_index, created_at, updated_at
FROM parts
WHERE episode_id = $1
ORDER BY order_index ASC;

-- name: GetPart :one
SELECT id, episode_id, title, description, order_index, created_at, updated_at
FROM parts
WHERE id = $1;

-- name: CreatePart :one
INSERT INTO parts (episode_id, title, description, order_index, org_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, episode_id, title, description, order_index, created_at, updated_at;

-- name: UpdatePart :one
UPDATE parts
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    order_index = COALESCE($4, order_index),
    updated_at = NOW()
WHERE id = $1
RETURNING id, episode_id, title, description, order_index, created_at, updated_at;

-- name: DeletePart :exec
DELETE FROM parts WHERE id = $1;

-- name: ListScenePlans :many
SELECT id, part_id, description, order_index, created_at, updated_at
FROM scene_plans
WHERE part_id = $1
ORDER BY order_index ASC;

-- name: GetScenePlan :one
SELECT id, part_id, description, order_index, created_at, updated_at
FROM scene_plans
WHERE id = $1;

-- name: CreateScenePlan :one
INSERT INTO scene_plans (part_id, description, order_index, org_id)
VALUES ($1, $2, $3, $4)
RETURNING id, part_id, description, order_index, created_at, updated_at;

-- name: UpdateScenePlan :one
UPDATE scene_plans
SET description = COALESCE($2, description),
    order_index = COALESCE($3, order_index),
    updated_at = NOW()
WHERE id = $1
RETURNING id, part_id, description, order_index, created_at, updated_at;

-- name: DeleteScenePlan :exec
DELETE FROM scene_plans WHERE id = $1;
