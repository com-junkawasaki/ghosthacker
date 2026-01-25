-- name: ListLocations :many
SELECT id, project_id, org_id, name, description, parent_location_id, image_id, location_type, address, latitude, longitude, size_sqm, capacity, atmosphere, accessibility, safety_level, metadata, created_at, updated_at
FROM locations
WHERE project_id = $1 AND org_id = $2
  AND ($3::UUID IS NULL OR parent_location_id = $3)
ORDER BY created_at DESC;

-- name: GetLocation :one
SELECT id, project_id, org_id, name, description, parent_location_id, image_id, location_type, address, latitude, longitude, size_sqm, capacity, atmosphere, accessibility, safety_level, metadata, created_at, updated_at
FROM locations
WHERE id = $1 AND org_id = $2;

-- name: CreateLocation :one
INSERT INTO locations (project_id, org_id, name, description, parent_location_id, image_id, location_type, address, latitude, longitude, size_sqm, capacity, atmosphere, accessibility, safety_level, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING id, project_id, org_id, name, description, parent_location_id, image_id, location_type, address, latitude, longitude, size_sqm, capacity, atmosphere, accessibility, safety_level, metadata, created_at, updated_at;

-- name: UpdateLocation :one
UPDATE locations
SET name = COALESCE($3, name),
    description = COALESCE($4, description),
    parent_location_id = COALESCE($5, parent_location_id),
    image_id = COALESCE($6, image_id),
    location_type = COALESCE($7, location_type),
    address = COALESCE($8, address),
    latitude = COALESCE($9, latitude),
    longitude = COALESCE($10, longitude),
    size_sqm = COALESCE($11, size_sqm),
    capacity = COALESCE($12, capacity),
    atmosphere = COALESCE($13, atmosphere),
    accessibility = COALESCE($14, accessibility),
    safety_level = COALESCE($15, safety_level),
    metadata = COALESCE($16, metadata),
    updated_at = NOW()
WHERE id = $1 AND org_id = $2
RETURNING id, project_id, org_id, name, description, parent_location_id, image_id, location_type, address, latitude, longitude, size_sqm, capacity, atmosphere, accessibility, safety_level, metadata, created_at, updated_at;

-- name: DeleteLocation :exec
DELETE FROM locations WHERE id = $1 AND org_id = $2;

-- name: ListLocationImages :many
SELECT id, location_id, angle, image_format, width, height, is_primary, created_at, updated_at
FROM location_images
WHERE location_id = $1
ORDER BY is_primary DESC, created_at ASC;

-- name: GetLocationImage :one
SELECT id, location_id, angle, image_format, width, height, is_primary, created_at, updated_at
FROM location_images
WHERE id = $1;

-- name: GetLocationImageData :one
SELECT image_data, image_format FROM location_images WHERE id = $1;

-- name: CreateLocationImage :one
INSERT INTO location_images (location_id, angle, image_data, image_format, width, height, is_primary)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, location_id, angle, image_format, width, height, is_primary, created_at, updated_at;

-- name: UpdateLocationImagePrimary :exec
UPDATE location_images SET is_primary = false WHERE location_id = $1 AND is_primary = true;

-- name: DeleteLocationImage :exec
DELETE FROM location_images WHERE id = $1;

-- name: ListLocation3DModels :many
SELECT id, location_id, model_format, is_primary, metadata, created_at, updated_at
FROM location_3d_models
WHERE location_id = $1
ORDER BY is_primary DESC, created_at ASC;

-- name: GetLocation3DModel :one
SELECT id, location_id, model_format, is_primary, metadata, created_at, updated_at
FROM location_3d_models
WHERE id = $1;

-- name: GetLocation3DModelData :one
SELECT model_data, model_format, texture_data, metadata FROM location_3d_models WHERE id = $1;

-- name: CreateLocation3DModel :one
INSERT INTO location_3d_models (location_id, model_format, model_data, texture_data, is_primary, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, location_id, model_format, is_primary, metadata, created_at, updated_at;

-- name: UpdateLocation3DModelPrimary :exec
UPDATE location_3d_models SET is_primary = false WHERE location_id = $1 AND is_primary = true;

-- name: DeleteLocation3DModel :exec
DELETE FROM location_3d_models WHERE id = $1;
