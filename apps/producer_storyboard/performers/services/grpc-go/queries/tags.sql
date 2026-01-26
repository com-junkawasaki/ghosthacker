-- name: ListTags :many
SELECT id, project_id, name, color, created_at
FROM tags
WHERE project_id = $1 AND org_id = $2
ORDER BY name ASC;

-- name: GetTag :one
SELECT id, project_id, name, color, created_at
FROM tags
WHERE id = $1 AND org_id = $2;

-- name: CreateTag :one
INSERT INTO tags (project_id, org_id, name, color)
VALUES ($1, $2, $3, $4)
RETURNING id, project_id, name, color, created_at;

-- name: UpdateTag :one
UPDATE tags
SET name = COALESCE($3, name),
    color = COALESCE($4, color)
WHERE id = $1 AND org_id = $2
RETURNING id, project_id, name, color, created_at;

-- name: DeleteTag :exec
DELETE FROM tags WHERE id = $1 AND org_id = $2;

-- name: ListResourceTags :many
SELECT t.id, t.project_id, t.name, t.color, t.created_at
FROM tags t
INNER JOIN resource_tags rt ON t.id = rt.tag_id
WHERE rt.resource_type = $1 AND rt.resource_id = $2 AND rt.org_id = $3
ORDER BY t.name ASC;

-- name: AddResourceTag :exec
INSERT INTO resource_tags (resource_type, resource_id, tag_id, org_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (resource_type, resource_id, tag_id) DO NOTHING;

-- name: RemoveResourceTag :exec
DELETE FROM resource_tags
WHERE resource_type = $1 AND resource_id = $2 AND tag_id = $3 AND org_id = $4;
