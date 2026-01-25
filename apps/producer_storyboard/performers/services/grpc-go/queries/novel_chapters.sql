-- name: ListNovelChapters :many
SELECT id, novel_project_id, title, order_index, content_html, content_json, created_at, updated_at
FROM novel_chapters
WHERE novel_project_id = $1
ORDER BY order_index ASC, created_at ASC;

-- name: GetNovelChapter :one
SELECT id, novel_project_id, title, order_index, content_html, content_json, created_at, updated_at
FROM novel_chapters
WHERE id = $1;

-- name: CreateNovelChapter :one
INSERT INTO novel_chapters (novel_project_id, title, order_index)
VALUES ($1, $2, $3)
RETURNING id, novel_project_id, title, order_index, content_html, content_json, created_at, updated_at;

-- name: UpdateNovelChapter :one
UPDATE novel_chapters
SET title = COALESCE($2, title),
    order_index = COALESCE($3, order_index),
    updated_at = NOW()
WHERE id = $1
RETURNING id, novel_project_id, title, order_index, content_html, content_json, created_at, updated_at;

-- name: UpdateNovelChapterContent :one
UPDATE novel_chapters
SET content_html = COALESCE($2, content_html),
    content_json = COALESCE($3, content_json),
    updated_at = NOW()
WHERE id = $1
RETURNING id, novel_project_id, title, order_index, content_html, content_json, created_at, updated_at;

-- name: DeleteNovelChapter :exec
DELETE FROM novel_chapters WHERE id = $1;
