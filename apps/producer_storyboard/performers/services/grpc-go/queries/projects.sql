-- name: ListProjects :many
SELECT id, title, description, created_at, updated_at
FROM storyboard_projects
WHERE ($1::text IS NULL OR org_id = $1)
ORDER BY created_at DESC;

-- name: ListProjectsByOrg :many
SELECT id, title, description, created_at, updated_at
FROM storyboard_projects
WHERE org_id = $1
ORDER BY created_at DESC;

-- name: GetProject :one
SELECT id, title, description, created_at, updated_at
FROM storyboard_projects
WHERE id = $1;

-- name: GetProjectByIdAndOrg :one
SELECT id, title, description, created_at, updated_at
FROM storyboard_projects
WHERE id = $1 AND org_id = $2;

-- name: CreateProject :one
INSERT INTO storyboard_projects (title, description, org_id)
VALUES ($1, $2, $3)
RETURNING id, title, description, created_at, updated_at;

-- name: UpdateProject :one
UPDATE storyboard_projects
SET title = COALESCE($2, title),
    description = COALESCE($3, description),
    updated_at = NOW()
WHERE id = $1
RETURNING id, title, description, created_at, updated_at;

-- name: DeleteProject :exec
DELETE FROM storyboard_projects WHERE id = $1;

-- name: GetProjectOrgId :one
SELECT org_id FROM storyboard_projects WHERE id = $1;
