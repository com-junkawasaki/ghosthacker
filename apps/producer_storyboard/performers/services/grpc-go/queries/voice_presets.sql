-- name: ListVoicePresets :many
SELECT id, project_id, name, hume_voice_id, description, character_id, sample_audio_id, settings, created_at, updated_at
FROM voice_presets
WHERE project_id = $1 AND org_id = $2
  AND ($3::UUID IS NULL OR character_id = $3)
ORDER BY created_at DESC;

-- name: GetVoicePreset :one
SELECT id, project_id, name, hume_voice_id, description, character_id, sample_audio_id, settings, created_at, updated_at
FROM voice_presets
WHERE id = $1 AND org_id = $2;

-- name: CreateVoicePreset :one
INSERT INTO voice_presets (project_id, org_id, name, hume_voice_id, description, character_id, sample_audio_id, settings)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, project_id, name, hume_voice_id, description, character_id, sample_audio_id, settings, created_at, updated_at;

-- name: UpdateVoicePreset :one
UPDATE voice_presets
SET name = COALESCE($3, name),
    hume_voice_id = COALESCE($4, hume_voice_id),
    description = COALESCE($5, description),
    character_id = COALESCE($6, character_id),
    sample_audio_id = COALESCE($7, sample_audio_id),
    settings = COALESCE($8, settings),
    updated_at = NOW()
WHERE id = $1 AND org_id = $2
RETURNING id, project_id, name, hume_voice_id, description, character_id, sample_audio_id, settings, created_at, updated_at;

-- name: DeleteVoicePreset :exec
DELETE FROM voice_presets WHERE id = $1 AND org_id = $2;
