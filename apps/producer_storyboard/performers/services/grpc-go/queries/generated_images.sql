-- name: ListGeneratedImages :many
SELECT id, scene_id, provider, external_image_id, image_format, image_type, prompt, model, character_id, created_at
FROM generated_images
WHERE scene_id = $1
ORDER BY created_at DESC;

-- name: GetGeneratedImage :one
SELECT id, scene_id, provider, external_image_id, image_format, image_type, prompt, model, character_id, created_at
FROM generated_images
WHERE id = $1;

-- name: GetGeneratedImageData :one
SELECT image_data, image_format FROM generated_images WHERE id = $1;

-- name: CreateGeneratedImage :one
INSERT INTO generated_images (scene_id, provider, external_image_id, image_data, image_format, image_type, prompt, model, character_id, org_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, scene_id, provider, external_image_id, image_format, image_type, prompt, model, character_id, created_at;

-- name: DeleteGeneratedImage :exec
DELETE FROM generated_images WHERE id = $1;

-- name: ListGeneratedImagesByCharacter :many
SELECT id, scene_id, provider, external_image_id, image_format, image_type, prompt, model, character_id, created_at
FROM generated_images
WHERE character_id = $1
ORDER BY created_at DESC;
