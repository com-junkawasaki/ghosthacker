-- name: ListJsonldNodes :many
SELECT id, novel_project_id, node_type, name, description, attributes_json, image_base64, created_at, updated_at
FROM jsonld_nodes
WHERE novel_project_id = $1
  AND ($2::text IS NULL OR node_type = $2)
ORDER BY node_type, name;

-- name: GetJsonldNode :one
SELECT id, novel_project_id, node_type, name, description, attributes_json, image_base64, created_at, updated_at
FROM jsonld_nodes
WHERE id = $1;

-- name: UpsertJsonldNode :one
INSERT INTO jsonld_nodes (id, novel_project_id, node_type, name, description, attributes_json, image_base64)
VALUES (
    COALESCE($1, gen_random_uuid()),
    $2, $3, $4, $5, $6, $7
)
ON CONFLICT (id) DO UPDATE
SET node_type = EXCLUDED.node_type,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    attributes_json = EXCLUDED.attributes_json,
    image_base64 = EXCLUDED.image_base64,
    updated_at = NOW()
RETURNING id, novel_project_id, node_type, name, description, attributes_json, image_base64, created_at, updated_at;

-- name: DeleteJsonldNode :exec
DELETE FROM jsonld_nodes WHERE id = $1;
