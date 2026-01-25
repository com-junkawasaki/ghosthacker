-- name: ListComposers :many
SELECT id, project_id, title, duration_seconds, created_at, updated_at
FROM composers
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: GetComposer :one
SELECT id, project_id, title, duration_seconds, created_at, updated_at
FROM composers
WHERE id = $1;

-- name: CreateComposer :one
INSERT INTO composers (project_id, title, duration_seconds)
VALUES ($1, $2, $3)
RETURNING id, project_id, title, duration_seconds, created_at, updated_at;

-- name: UpdateComposer :one
UPDATE composers
SET title = COALESCE($2, title),
    duration_seconds = COALESCE($3, duration_seconds),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, title, duration_seconds, created_at, updated_at;

-- name: DeleteComposer :exec
DELETE FROM composers WHERE id = $1;

-- name: ListAudioTracks :many
SELECT id, composer_id, track_number, track_type, name, created_at, updated_at
FROM audio_tracks
WHERE composer_id = $1
ORDER BY track_number ASC;

-- name: GetAudioTrack :one
SELECT id, composer_id, track_number, track_type, name, created_at, updated_at
FROM audio_tracks
WHERE id = $1;

-- name: CreateAudioTrack :one
INSERT INTO audio_tracks (composer_id, track_number, track_type, name)
VALUES ($1, $2, $3, $4)
RETURNING id, composer_id, track_number, track_type, name, created_at, updated_at;

-- name: DeleteAudioTrack :exec
DELETE FROM audio_tracks WHERE id = $1;

-- name: ListAudioClips :many
SELECT id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at
FROM audio_clips
WHERE track_id = $1
ORDER BY start_time_seconds ASC;

-- name: GetAudioClip :one
SELECT id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at
FROM audio_clips
WHERE id = $1;

-- name: CreateAudioClip :one
INSERT INTO audio_clips (track_id, start_time_seconds, duration_seconds, audio_type, audio_url, metadata)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, track_id, start_time_seconds, duration_seconds, audio_type, audio_url, audio_data_id, metadata, created_at, updated_at;

-- name: DeleteAudioClip :exec
DELETE FROM audio_clips WHERE id = $1;

-- name: ListSunoMusic :many
SELECT id, composer_id, prompt, status, audio_url, audio_data_id, task_id, created_at, updated_at
FROM suno_music
WHERE composer_id = $1
ORDER BY created_at DESC;

-- name: GetSunoMusic :one
SELECT id, composer_id, prompt, status, audio_url, audio_data_id, task_id, created_at, updated_at
FROM suno_music
WHERE id = $1;

-- name: CreateSunoMusic :one
INSERT INTO suno_music (composer_id, prompt, status)
VALUES ($1, $2, 'pending')
RETURNING id, composer_id, prompt, status, audio_url, audio_data_id, task_id, created_at, updated_at;

-- name: UpdateSunoMusicStatus :one
UPDATE suno_music
SET status = $2,
    audio_url = $3,
    task_id = $4,
    updated_at = NOW()
WHERE id = $1
RETURNING id, composer_id, prompt, status, audio_url, audio_data_id, task_id, created_at, updated_at;

-- name: DeleteSunoMusic :exec
DELETE FROM suno_music WHERE id = $1;
