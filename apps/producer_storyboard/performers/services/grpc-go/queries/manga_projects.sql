-- name: ListMangaProjectsByProjectId :many
SELECT id, project_id, title, description, created_at, updated_at
FROM manga_projects
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetMangaProject :one
SELECT id, project_id, title, description, created_at, updated_at
FROM manga_projects
WHERE id = $1;

-- name: GetMangaProjectByProjectId :one
SELECT id, project_id, title, description, created_at, updated_at
FROM manga_projects
WHERE project_id = $1;

-- name: CreateMangaProject :one
INSERT INTO manga_projects (project_id, title, description, org_id)
VALUES ($1, $2, $3, $4)
RETURNING id, project_id, title, description, created_at, updated_at;

-- name: UpdateMangaProject :one
UPDATE manga_projects
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, title, description, created_at, updated_at;

-- name: DeleteMangaProject :exec
DELETE FROM manga_projects WHERE id = $1;

-- name: GetMangaProjectOrgId :one
SELECT org_id FROM manga_projects WHERE id = $1;
