-- Storyboard Editor Database Schema

-- Projects
CREATE TABLE IF NOT EXISTS storyboard_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_projects_created_at ON storyboard_projects(created_at DESC);

-- Storyboards
CREATE TABLE IF NOT EXISTS storyboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    aspect_ratio VARCHAR(20) DEFAULT '16:9',
    resolution VARCHAR(20) DEFAULT '1920x1080',
    duration_seconds INTEGER,
    num_variations INTEGER DEFAULT 1,
    storyboard_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storyboards_project_id ON storyboards(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_created_at ON storyboards(created_at DESC);

-- Scenes
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    text_description TEXT,
    media_type VARCHAR(20), -- 'video', 'image', 'text'
    media_url TEXT,
    media_data BYTEA, -- Uploaded media
    start_time_seconds DECIMAL(10,2),
    duration_seconds DECIMAL(10,2),
    transition_type VARCHAR(20), -- 'cut', 'fade', 'dissolve'
    scene_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(storyboard_id, scene_number)
);

CREATE INDEX IF NOT EXISTS idx_scenes_storyboard_id ON scenes(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_scenes_storyboard_scene_number ON scenes(storyboard_id, scene_number);

-- Generated Videos
CREATE TABLE IF NOT EXISTS generated_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storyboard_id UUID NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
    variation_number INTEGER DEFAULT 1,
    video_url TEXT,
    video_data BYTEA,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    openai_job_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_videos_storyboard_id ON generated_videos(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_status ON generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_openai_job_id ON generated_videos(openai_job_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_created_at ON generated_videos(created_at DESC);
