-- name: ListWorldSettings :many
SELECT id, project_id, org_id, name, description, setting_type, time_period, geography, climate, culture, politics, economy, magic_system, rules, history, attributes_json, created_at, updated_at
FROM world_settings
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetWorldSetting :one
SELECT id, project_id, org_id, name, description, setting_type, time_period, geography, climate, culture, politics, economy, magic_system, rules, history, attributes_json, created_at, updated_at
FROM world_settings
WHERE id = $1;

-- name: CreateWorldSetting :one
INSERT INTO world_settings (project_id, org_id, name, description, setting_type, time_period, geography, climate, culture, politics, economy, magic_system, rules, history, attributes_json)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
RETURNING id, project_id, org_id, name, description, setting_type, time_period, geography, climate, culture, politics, economy, magic_system, rules, history, attributes_json, created_at, updated_at;

-- name: UpdateWorldSetting :one
UPDATE world_settings
SET name = COALESCE($2, name),
    description = COALESCE($3, description),
    setting_type = COALESCE($4, setting_type),
    time_period = COALESCE($5, time_period),
    geography = COALESCE($6, geography),
    climate = COALESCE($7, climate),
    culture = COALESCE($8, culture),
    politics = COALESCE($9, politics),
    economy = COALESCE($10, economy),
    magic_system = COALESCE($11, magic_system),
    rules = COALESCE($12, rules),
    history = COALESCE($13, history),
    attributes_json = COALESCE($14, attributes_json),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, org_id, name, description, setting_type, time_period, geography, climate, culture, politics, economy, magic_system, rules, history, attributes_json, created_at, updated_at;

-- name: DeleteWorldSetting :exec
DELETE FROM world_settings WHERE id = $1;
