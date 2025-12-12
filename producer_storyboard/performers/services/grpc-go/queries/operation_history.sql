-- name: ListOperationHistory :many
SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
FROM operation_history
ORDER BY created_at DESC
LIMIT 100;

-- name: ListOperationHistoryByEntity :many
SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
FROM operation_history
WHERE entity_id = $1 AND ($2::text IS NULL OR entity_type = $2)
ORDER BY created_at DESC
LIMIT 100;

-- name: ListOperationHistoryByType :many
SELECT id, entity_type, entity_id, operation_type, operation_data, user_id, created_at
FROM operation_history
WHERE entity_type = $1
ORDER BY created_at DESC
LIMIT 100;

-- name: CreateOperationHistory :one
INSERT INTO operation_history (entity_type, entity_id, operation_type, operation_data, user_id, org_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, entity_type, entity_id, operation_type, operation_data, user_id, created_at;
