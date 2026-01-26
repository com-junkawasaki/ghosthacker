-- name: ListCharacters :many
SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, age, gender, birth_date, height_cm, weight_kg, hair_color, eye_color, occupation_id, organization_id, attributes_json, created_at, updated_at
FROM characters
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetCharacter :one
SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, age, gender, birth_date, height_cm, weight_kg, hair_color, eye_color, occupation_id, organization_id, attributes_json, created_at, updated_at
FROM characters
WHERE id = $1;

-- name: CreateCharacter :one
INSERT INTO characters (project_id, name, description, personality, background, default_hume_voice_id, org_id, age, gender, birth_date, height_cm, weight_kg, hair_color, eye_color, occupation_id, organization_id, attributes_json)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
RETURNING id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, age, gender, birth_date, height_cm, weight_kg, hair_color, eye_color, occupation_id, organization_id, attributes_json, created_at, updated_at;

-- name: UpdateCharacter :one
UPDATE characters
SET name = COALESCE($2, name),
    description = COALESCE($3, description),
    personality = COALESCE($4, personality),
    background = COALESCE($5, background),
    default_hume_voice_id = COALESCE($6, default_hume_voice_id),
    profile_image_id = COALESCE($7, profile_image_id),
    age = COALESCE($8, age),
    gender = COALESCE($9, gender),
    birth_date = COALESCE($10, birth_date),
    height_cm = COALESCE($11, height_cm),
    weight_kg = COALESCE($12, weight_kg),
    hair_color = COALESCE($13, hair_color),
    eye_color = COALESCE($14, eye_color),
    occupation_id = COALESCE($15, occupation_id),
    organization_id = COALESCE($16, organization_id),
    attributes_json = COALESCE($17, attributes_json),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, age, gender, birth_date, height_cm, weight_kg, hair_color, eye_color, occupation_id, organization_id, attributes_json, created_at, updated_at;

-- name: DeleteCharacter :exec
DELETE FROM characters WHERE id = $1;

-- name: ListCharacterAssets :many
SELECT id, character_id, asset_type, asset_format, created_at, updated_at
FROM character_assets
WHERE character_id = $1
ORDER BY created_at DESC;

-- name: GetCharacterAssetData :one
SELECT asset_data, asset_format FROM character_assets WHERE id = $1;

-- name: CreateCharacterAsset :one
INSERT INTO character_assets (character_id, asset_type, asset_data, asset_format, org_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, character_id, asset_type, asset_format, created_at, updated_at;

-- name: DeleteCharacterAsset :exec
DELETE FROM character_assets WHERE id = $1;

-- name: ListCharacterImages :many
SELECT id, character_id, angle, image_format, width, height, is_primary, created_at, updated_at
FROM character_images
WHERE character_id = $1
ORDER BY is_primary DESC, created_at ASC;

-- name: GetCharacterImage :one
SELECT id, character_id, angle, image_format, width, height, is_primary, created_at, updated_at
FROM character_images
WHERE id = $1;

-- name: GetCharacterImageData :one
SELECT image_data, image_format FROM character_images WHERE id = $1;

-- name: CreateCharacterImage :one
INSERT INTO character_images (character_id, angle, image_data, image_format, width, height, is_primary)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, character_id, angle, image_format, width, height, is_primary, created_at, updated_at;

-- name: UpdateCharacterImagePrimary :exec
UPDATE character_images SET is_primary = false WHERE character_id = $1 AND is_primary = true;

-- name: DeleteCharacterImage :exec
DELETE FROM character_images WHERE id = $1;

-- name: ListCharacter3DModels :many
SELECT id, character_id, model_format, is_primary, metadata, created_at, updated_at
FROM character_3d_models
WHERE character_id = $1
ORDER BY is_primary DESC, created_at ASC;

-- name: GetCharacter3DModel :one
SELECT id, character_id, model_format, is_primary, metadata, created_at, updated_at
FROM character_3d_models
WHERE id = $1;

-- name: GetCharacter3DModelData :one
SELECT model_data, model_format, texture_data, metadata FROM character_3d_models WHERE id = $1;

-- name: CreateCharacter3DModel :one
INSERT INTO character_3d_models (character_id, model_format, model_data, texture_data, is_primary, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, character_id, model_format, is_primary, metadata, created_at, updated_at;

-- name: UpdateCharacter3DModelPrimary :exec
UPDATE character_3d_models SET is_primary = false WHERE character_id = $1 AND is_primary = true;

-- name: DeleteCharacter3DModel :exec
DELETE FROM character_3d_models WHERE id = $1;
