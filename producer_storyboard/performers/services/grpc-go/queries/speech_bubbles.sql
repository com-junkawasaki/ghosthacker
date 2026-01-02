-- name: ListSpeechBubbles :many
SELECT id, panel_id, bubble_type, text, speaker, x, y, width, height, created_at, updated_at
FROM speech_bubbles
WHERE panel_id = $1
ORDER BY created_at ASC;

-- name: GetSpeechBubble :one
SELECT id, panel_id, bubble_type, text, speaker, x, y, width, height, created_at, updated_at
FROM speech_bubbles
WHERE id = $1;

-- name: CreateSpeechBubble :one
INSERT INTO speech_bubbles (panel_id, bubble_type, text, speaker, x, y, width, height)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, panel_id, bubble_type, text, speaker, x, y, width, height, created_at, updated_at;

-- name: UpdateSpeechBubble :one
UPDATE speech_bubbles
SET bubble_type = COALESCE($2, bubble_type),
    text = COALESCE($3, text),
    speaker = COALESCE($4, speaker),
    x = COALESCE($5, x),
    y = COALESCE($6, y),
    width = COALESCE($7, width),
    height = COALESCE($8, height),
    updated_at = NOW()
WHERE id = $1
RETURNING id, panel_id, bubble_type, text, speaker, x, y, width, height, created_at, updated_at;

-- name: DeleteSpeechBubble :exec
DELETE FROM speech_bubbles WHERE id = $1;
