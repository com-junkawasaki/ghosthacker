-- name: CreateMangaGeneratedImage :one
INSERT INTO manga_generated_images (manga_project_id, panel_id, image_data, image_format, width, height, prompt, model)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, manga_project_id, panel_id, image_data, image_format, width, height, prompt, model, created_at;

-- name: GetMangaGeneratedImage :one
SELECT id, manga_project_id, panel_id, image_data, image_format, width, height, prompt, model, created_at
FROM manga_generated_images
WHERE id = $1;

-- name: ListMangaGeneratedImages :many
SELECT id, manga_project_id, panel_id, image_data, image_format, width, height, prompt, model, created_at
FROM manga_generated_images
WHERE manga_project_id = $1
ORDER BY created_at DESC;
