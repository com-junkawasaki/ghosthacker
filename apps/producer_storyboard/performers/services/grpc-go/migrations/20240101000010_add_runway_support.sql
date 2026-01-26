-- Add provider column to distinguish between video generation services
ALTER TABLE generated_videos
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS runway_task_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS generation_params JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS model VARCHAR(100);

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_generated_videos_provider ON generated_videos(provider);
CREATE INDEX IF NOT EXISTS idx_generated_videos_runway_task_id ON generated_videos(runway_task_id);

-- Add unique constraint for runway_task_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_videos_runway_task_id_unique 
ON generated_videos(runway_task_id) 
WHERE runway_task_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN generated_videos.provider IS 'Video generation provider: openai, runway';
COMMENT ON COLUMN generated_videos.runway_task_id IS 'Runway ML task ID for polling status';
COMMENT ON COLUMN generated_videos.generation_params IS 'Provider-specific generation parameters (JSON)';
COMMENT ON COLUMN generated_videos.model IS 'AI model used for generation (e.g., gen3a_turbo, gen3a, dall-e-3)';
COMMENT ON COLUMN generated_videos.duration IS 'Video duration in seconds (for providers that support custom duration)';

