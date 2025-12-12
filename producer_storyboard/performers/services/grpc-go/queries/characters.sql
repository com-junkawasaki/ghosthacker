-- name: ListCharacters :many
SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
FROM characters
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetCharacter :one
SELECT id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at
FROM characters
WHERE id = $1;

-- name: CreateCharacter :one
INSERT INTO characters (project_id, name, description, personality, background, default_hume_voice_id, org_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at;

-- name: UpdateCharacter :one
UPDATE characters
SET name = COALESCE($2, name),
    description = COALESCE($3, description),
    personality = COALESCE($4, personality),
    background = COALESCE($5, background),
    default_hume_voice_id = COALESCE($6, default_hume_voice_id),
    profile_image_id = COALESCE($7, profile_image_id),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, name, description, personality, background, default_hume_voice_id, profile_image_id, created_at, updated_at;

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
