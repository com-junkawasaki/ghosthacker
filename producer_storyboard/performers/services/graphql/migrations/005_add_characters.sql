-- Add characters and dialogues tables for multi-language dialogue management with Hume AI integration

-- Characters Table: Project-wide character definitions
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at DESC);

-- Dialogues Table: Scene-specific character dialogues with multi-language support
CREATE TABLE IF NOT EXISTS dialogues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'ja', -- 'ja', 'en', 'hi'
    text TEXT NOT NULL,
    translated_text JSONB DEFAULT '{}'::jsonb, -- Store translations: {"en": "...", "hi": "..."}
    hume_voice_id VARCHAR(255), -- Hume AI voice ID
    audio_url TEXT, -- URL to generated audio file
    audio_data BYTEA, -- Audio file data (BYTEA)
    start_time_seconds DECIMAL(10,2), -- Dialogue start time within scene
    duration_seconds DECIMAL(10,2), -- Dialogue duration
    order_index INTEGER DEFAULT 0, -- Order within scene for multiple dialogues
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogues_scene_id ON dialogues(scene_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_character_id ON dialogues(character_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_language ON dialogues(language);
CREATE INDEX IF NOT EXISTS idx_dialogues_scene_order ON dialogues(scene_id, order_index);

