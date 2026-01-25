-- name: ListProps :many
SELECT id, project_id, org_id, name, description, category, material, size, weight_kg, value_amount, value_currency, rarity, function_description, owner_character_id, location_id, related_technology_id, tags, attributes_json, created_at, updated_at
FROM props
WHERE project_id = $1
  AND ($2::text IS NULL OR category = $2)
  AND ($3::text[] IS NULL OR tags && $3)
ORDER BY created_at ASC;

-- name: GetProp :one
SELECT id, project_id, org_id, name, description, category, material, size, weight_kg, value_amount, value_currency, rarity, function_description, owner_character_id, location_id, related_technology_id, tags, attributes_json, created_at, updated_at
FROM props
WHERE id = $1;

-- name: CreateProp :one
INSERT INTO props (project_id, org_id, name, description, category, material, size, weight_kg, value_amount, value_currency, rarity, function_description, owner_character_id, location_id, related_technology_id, tags, attributes_json)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
RETURNING id, project_id, org_id, name, description, category, material, size, weight_kg, value_amount, value_currency, rarity, function_description, owner_character_id, location_id, related_technology_id, tags, attributes_json, created_at, updated_at;

-- name: UpdateProp :one
UPDATE props
SET name = COALESCE($2, name),
    description = COALESCE($3, description),
    category = COALESCE($4, category),
    material = COALESCE($5, material),
    size = COALESCE($6, size),
    weight_kg = COALESCE($7, weight_kg),
    value_amount = COALESCE($8, value_amount),
    value_currency = COALESCE($9, value_currency),
    rarity = COALESCE($10, rarity),
    function_description = COALESCE($11, function_description),
    owner_character_id = COALESCE($12, owner_character_id),
    location_id = COALESCE($13, location_id),
    related_technology_id = COALESCE($14, related_technology_id),
    tags = COALESCE($15, tags),
    attributes_json = COALESCE($16, attributes_json),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, org_id, name, description, category, material, size, weight_kg, value_amount, value_currency, rarity, function_description, owner_character_id, location_id, related_technology_id, tags, attributes_json, created_at, updated_at;

-- name: DeleteProp :exec
DELETE FROM props WHERE id = $1;

-- name: ListPropImages :many
SELECT id, prop_id, angle, image_format, width, height, is_primary, created_at, updated_at
FROM prop_images
WHERE prop_id = $1
ORDER BY is_primary DESC, created_at ASC;

-- name: GetPropImage :one
SELECT id, prop_id, angle, image_format, width, height, is_primary, created_at, updated_at
FROM prop_images
WHERE id = $1;

-- name: GetPropImageData :one
SELECT image_data, image_format FROM prop_images WHERE id = $1;

-- name: CreatePropImage :one
INSERT INTO prop_images (prop_id, angle, image_data, image_format, width, height, is_primary)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, prop_id, angle, image_format, width, height, is_primary, created_at, updated_at;

-- name: UpdatePropImagePrimary :exec
UPDATE prop_images SET is_primary = false WHERE prop_id = $1 AND is_primary = true;

-- name: DeletePropImage :exec
DELETE FROM prop_images WHERE id = $1;

-- name: ListProp3DModels :many
SELECT id, prop_id, model_format, is_primary, metadata, created_at, updated_at
FROM prop_3d_models
WHERE prop_id = $1
ORDER BY is_primary DESC, created_at ASC;

-- name: GetProp3DModel :one
SELECT id, prop_id, model_format, is_primary, metadata, created_at, updated_at
FROM prop_3d_models
WHERE id = $1;

-- name: GetProp3DModelData :one
SELECT model_data, model_format, texture_data, metadata FROM prop_3d_models WHERE id = $1;

-- name: CreateProp3DModel :one
INSERT INTO prop_3d_models (prop_id, model_format, model_data, texture_data, is_primary, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, prop_id, model_format, is_primary, metadata, created_at, updated_at;

-- name: UpdateProp3DModelPrimary :exec
UPDATE prop_3d_models SET is_primary = false WHERE prop_id = $1 AND is_primary = true;

-- name: DeleteProp3DModel :exec
DELETE FROM prop_3d_models WHERE id = $1;
