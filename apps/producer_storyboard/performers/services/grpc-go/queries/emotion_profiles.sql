-- name: UpsertEmotionProfile :one
INSERT INTO emotion_profiles (node_id, node_type, joy, sadness, fear, anger, surprise, trust, anticipation, disgust, relief, hope, emotion_vector_json)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (node_id, node_type) DO UPDATE
SET joy = EXCLUDED.joy,
    sadness = EXCLUDED.sadness,
    fear = EXCLUDED.fear,
    anger = EXCLUDED.anger,
    surprise = EXCLUDED.surprise,
    trust = EXCLUDED.trust,
    anticipation = EXCLUDED.anticipation,
    disgust = EXCLUDED.disgust,
    relief = EXCLUDED.relief,
    hope = EXCLUDED.hope,
    emotion_vector_json = EXCLUDED.emotion_vector_json,
    updated_at = NOW()
RETURNING id, node_id, node_type, joy, sadness, fear, anger, surprise, trust, anticipation, disgust, relief, hope, emotion_vector_json, created_at, updated_at;

-- name: GetEmotionProfile :one
SELECT id, node_id, node_type, joy, sadness, fear, anger, surprise, trust, anticipation, disgust, relief, hope, emotion_vector_json, created_at, updated_at
FROM emotion_profiles
WHERE node_id = $1 AND node_type = $2;
