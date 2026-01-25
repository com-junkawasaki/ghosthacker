-- name: ListNovelProjectsByProjectId :many
SELECT id, project_id, title, description, language, created_at, updated_at
FROM novel_projects
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetNovelProject :one
SELECT id, project_id, title, description, language, created_at, updated_at
FROM novel_projects
WHERE id = $1;

-- name: GetNovelProjectByProjectId :one
SELECT id, project_id, title, description, language, created_at, updated_at
FROM novel_projects
WHERE project_id = $1;

-- name: CreateNovelProject :one
INSERT INTO novel_projects (project_id, title, description, language, org_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, project_id, title, description, language, created_at, updated_at;

-- name: UpdateNovelProject :one
UPDATE novel_projects
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    language = COALESCE($4, language),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, title, description, language, created_at, updated_at;

-- name: DeleteNovelProject :exec
DELETE FROM novel_projects WHERE id = $1;

-- name: GetNovelProjectOrgId :one
SELECT org_id FROM novel_projects WHERE id = $1;
