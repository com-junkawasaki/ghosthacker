-- name: ListMangaPanels :many
SELECT id, page_id, order_index, x, y, width, height, layout_type, prompt, created_at, updated_at
FROM manga_panels
WHERE page_id = $1
ORDER BY order_index ASC;

-- name: GetMangaPanel :one
SELECT id, page_id, order_index, x, y, width, height, layout_type, prompt, created_at, updated_at
FROM manga_panels
WHERE id = $1;

-- name: CreateMangaPanel :one
INSERT INTO manga_panels (page_id, order_index, x, y, width, height, layout_type, prompt)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, page_id, order_index, x, y, width, height, layout_type, prompt, created_at, updated_at;

-- name: UpdateMangaPanel :one
UPDATE manga_panels
SET order_index = COALESCE($2, order_index),
    x = COALESCE($3, x),
    y = COALESCE($4, y),
    width = COALESCE($5, width),
    height = COALESCE($6, height),
    layout_type = COALESCE($7, layout_type),
    prompt = COALESCE($8, prompt),
    updated_at = NOW()
WHERE id = $1
RETURNING id, page_id, order_index, x, y, width, height, layout_type, prompt, created_at, updated_at;

-- name: DeleteMangaPanel :exec
DELETE FROM manga_panels WHERE id = $1;
