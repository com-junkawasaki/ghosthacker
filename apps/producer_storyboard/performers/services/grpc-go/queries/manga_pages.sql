-- name: ListMangaPages :many
SELECT id, manga_project_id, page_number, konva_stage_json, created_at, updated_at
FROM manga_pages
WHERE manga_project_id = $1
ORDER BY page_number ASC;

-- name: GetMangaPage :one
SELECT id, manga_project_id, page_number, konva_stage_json, created_at, updated_at
FROM manga_pages
WHERE id = $1;

-- name: CreateMangaPage :one
INSERT INTO manga_pages (manga_project_id, page_number)
VALUES ($1, $2)
RETURNING id, manga_project_id, page_number, konva_stage_json, created_at, updated_at;

-- name: UpdateMangaPage :one
UPDATE manga_pages
SET page_number = COALESCE($2, page_number),
    updated_at = NOW()
WHERE id = $1
RETURNING id, manga_project_id, page_number, konva_stage_json, created_at, updated_at;

-- name: UpdateMangaPageContent :one
UPDATE manga_pages
SET konva_stage_json = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING id, manga_project_id, page_number, konva_stage_json, created_at, updated_at;

-- name: DeleteMangaPage :exec
DELETE FROM manga_pages WHERE id = $1;
