-- name: ListDialogues :many
SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
       start_time_seconds, duration_seconds, order_index, emotion_name, emotion_x, emotion_y,
       created_at, updated_at
FROM dialogues
WHERE scene_id = $1
ORDER BY order_index ASC, created_at ASC;

-- name: GetDialogue :one
SELECT id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
       start_time_seconds, duration_seconds, order_index, emotion_name, emotion_x, emotion_y,
       created_at, updated_at
FROM dialogues
WHERE id = $1;

-- name: GetDialogueAudioData :one
SELECT audio_data FROM dialogues WHERE id = $1 AND audio_data IS NOT NULL;

-- name: CreateDialogue :one
INSERT INTO dialogues (scene_id, character_id, language, text, order_index, hume_voice_id, org_id, emotion_name, emotion_x, emotion_y)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
          start_time_seconds, duration_seconds, order_index, emotion_name, emotion_x, emotion_y,
          created_at, updated_at;

-- name: UpdateDialogue :one
UPDATE dialogues
SET text = COALESCE($2, text),
    order_index = COALESCE($3, order_index),
    hume_voice_id = COALESCE($4, hume_voice_id),
    emotion_name = COALESCE($5, emotion_name),
    emotion_x = COALESCE($6, emotion_x),
    emotion_y = COALESCE($7, emotion_y),
    updated_at = NOW()
WHERE id = $1
RETURNING id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
          start_time_seconds, duration_seconds, order_index, emotion_name, emotion_x, emotion_y,
          created_at, updated_at;

-- name: UpdateDialogueAudio :one
UPDATE dialogues
SET audio_data = $2,
    audio_url = $3,
    duration_seconds = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING id, scene_id, character_id, language, text, translated_text, hume_voice_id, audio_url,
          start_time_seconds, duration_seconds, order_index, emotion_name, emotion_x, emotion_y,
          created_at, updated_at;

-- name: DeleteDialogue :exec
DELETE FROM dialogues WHERE id = $1;

-- name: GetMaxDialogueOrderIndex :one
SELECT COALESCE(MAX(order_index), -1) FROM dialogues WHERE scene_id = $1;
