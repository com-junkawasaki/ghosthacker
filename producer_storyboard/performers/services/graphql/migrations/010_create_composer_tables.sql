-- Create composer tables for audio composition functionality
-- Supports multi-track audio editing with AI-generated music (Suno) and voice (Hume)

-- Composers table - main composition container
CREATE TABLE IF NOT EXISTS composers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Composer',
    duration_seconds DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audio tracks table - individual tracks within a composer
CREATE TABLE IF NOT EXISTS audio_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composer_id UUID NOT NULL REFERENCES composers(id) ON DELETE CASCADE,
    track_number INTEGER NOT NULL,
    track_type VARCHAR(50) NOT NULL CHECK (track_type IN ('bgm', 'voice', 'sfx', 'narration')),
    name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(composer_id, track_number)
);

-- Audio clips table - individual audio segments on tracks
CREATE TABLE IF NOT EXISTS audio_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES audio_tracks(id) ON DELETE CASCADE,
    start_time_seconds DOUBLE PRECISION NOT NULL,
    duration_seconds DOUBLE PRECISION NOT NULL,
    audio_type VARCHAR(50) NOT NULL CHECK (audio_type IN ('suno', 'hume', 'uploaded')),
    audio_url VARCHAR(500),
    audio_data_id UUID, -- Reference to stored audio data (can reference generated_images or new audio_data table)
    metadata TEXT, -- JSON metadata for additional clip information
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suno music table - tracks AI-generated music from Suno API
CREATE TABLE IF NOT EXISTS suno_music (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    composer_id UUID REFERENCES composers(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    audio_url VARCHAR(500),
    audio_data_id UUID, -- Reference to stored audio data
    task_id VARCHAR(255), -- Suno API task ID for polling status
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for foreign keys and common queries
CREATE INDEX IF NOT EXISTS idx_composers_project_id ON composers(project_id);
CREATE INDEX IF NOT EXISTS idx_composers_created_at ON composers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_tracks_composer_id ON audio_tracks(composer_id);
CREATE INDEX IF NOT EXISTS idx_audio_tracks_track_number ON audio_tracks(composer_id, track_number);

CREATE INDEX IF NOT EXISTS idx_audio_clips_track_id ON audio_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_audio_clips_start_time ON audio_clips(track_id, start_time_seconds);

CREATE INDEX IF NOT EXISTS idx_suno_music_composer_id ON suno_music(composer_id);
CREATE INDEX IF NOT EXISTS idx_suno_music_status ON suno_music(status);
CREATE INDEX IF NOT EXISTS idx_suno_music_task_id ON suno_music(task_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_composers_updated_at BEFORE UPDATE ON composers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_tracks_updated_at BEFORE UPDATE ON audio_tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_clips_updated_at BEFORE UPDATE ON audio_clips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suno_music_updated_at BEFORE UPDATE ON suno_music
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

