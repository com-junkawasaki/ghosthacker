-- Extend characters table with personality, background, default Hume voice, and profile image
-- Add character_assets table for storing character-related images and audio files

-- Extend characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS personality TEXT,
ADD COLUMN IF NOT EXISTS background TEXT,
ADD COLUMN IF NOT EXISTS default_hume_voice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_image_id UUID;

-- Create character_assets table for storing character-related assets (images and audio)
CREATE TABLE IF NOT EXISTS character_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('image', 'audio')),
    asset_data BYTEA NOT NULL,
    asset_format VARCHAR(20), -- 'png', 'jpeg', 'webp', 'mp3', 'wav', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint for profile_image_id
ALTER TABLE characters
ADD CONSTRAINT fk_characters_profile_image_id
FOREIGN KEY (profile_image_id) REFERENCES character_assets(id) ON DELETE SET NULL;

-- Create indexes for character_assets
CREATE INDEX IF NOT EXISTS idx_character_assets_character_id ON character_assets(character_id);
CREATE INDEX IF NOT EXISTS idx_character_assets_asset_type ON character_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_character_assets_created_at ON character_assets(created_at DESC);


