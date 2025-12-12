-- Add characters and dialogues tables for multi-language dialogue management with Hume AI integration

-- Characters Table: Project-wide character definitions
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality TEXT,
    background TEXT,
    default_hume_voice_id VARCHAR(255),
    profile_image_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at DESC);

-- Character Assets Table
CREATE TABLE IF NOT EXISTS character_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('image', 'audio')),
    asset_data BYTEA NOT NULL,
    asset_format VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_assets_character_id ON character_assets(character_id);
CREATE INDEX IF NOT EXISTS idx_character_assets_asset_type ON character_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_character_assets_created_at ON character_assets(created_at DESC);

-- Add foreign key constraint for profile_image_id
ALTER TABLE characters
ADD CONSTRAINT fk_characters_profile_image_id
FOREIGN KEY (profile_image_id) REFERENCES character_assets(id) ON DELETE SET NULL;

-- Dialogues Table: Scene-specific character dialogues with multi-language support
CREATE TABLE IF NOT EXISTS dialogues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'ja',
    text TEXT NOT NULL,
    translated_text JSONB DEFAULT '{}'::jsonb,
    hume_voice_id VARCHAR(255),
    audio_url TEXT,
    audio_data BYTEA,
    start_time_seconds DECIMAL(10,2),
    duration_seconds DECIMAL(10,2),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogues_scene_id ON dialogues(scene_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_character_id ON dialogues(character_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_language ON dialogues(language);
CREATE INDEX IF NOT EXISTS idx_dialogues_scene_order ON dialogues(scene_id, order_index);
