-- Add emotion fields to dialogues table
ALTER TABLE dialogues
ADD COLUMN IF NOT EXISTS emotion_name TEXT,
ADD COLUMN IF NOT EXISTS emotion_x DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS emotion_y DOUBLE PRECISION;

-- Add index for emotion queries
CREATE INDEX IF NOT EXISTS idx_dialogues_emotion_name ON dialogues(emotion_name) WHERE emotion_name IS NOT NULL;

-- Comments
COMMENT ON COLUMN dialogues.emotion_name IS 'Name of the emotion selected from emotion map (e.g., Joy, Anger, Sadness)';
COMMENT ON COLUMN dialogues.emotion_x IS 'X coordinate on emotion map (0-100 normalized)';
COMMENT ON COLUMN dialogues.emotion_y IS 'Y coordinate on emotion map (0-100 normalized)';

