-- name: ListProjectAssets :many
SELECT id, project_id, asset_type, asset_format, filename, description, tags, metadata, created_at, updated_at
FROM project_assets
WHERE project_id = $1 AND org_id = $2
  AND ($3::VARCHAR IS NULL OR asset_type = $3)
  AND ($4::TEXT[] IS NULL OR tags && $4)
ORDER BY created_at DESC;

-- name: GetProjectAsset :one
SELECT id, project_id, asset_type, asset_format, filename, description, tags, metadata, created_at, updated_at
FROM project_assets
WHERE id = $1 AND org_id = $2;

-- name: GetProjectAssetData :one
SELECT asset_data, asset_format FROM project_assets WHERE id = $1 AND org_id = $2;

-- name: CreateProjectAsset :one
INSERT INTO project_assets (project_id, org_id, asset_type, asset_data, asset_format, filename, description, tags, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, project_id, asset_type, asset_format, filename, description, tags, metadata, created_at, updated_at;

-- name: UpdateProjectAsset :one
UPDATE project_assets
SET filename = COALESCE($3, filename),
    description = COALESCE($4, description),
    tags = COALESCE($5, tags),
    metadata = COALESCE($6, metadata),
    updated_at = NOW()
WHERE id = $1 AND org_id = $2
RETURNING id, project_id, asset_type, asset_format, filename, description, tags, metadata, created_at, updated_at;

-- name: DeleteProjectAsset :exec
DELETE FROM project_assets WHERE id = $1 AND org_id = $2;
