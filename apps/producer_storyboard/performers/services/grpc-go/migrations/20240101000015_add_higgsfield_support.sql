-- Add Higgsfield API support for character and image generation

-- Add provider and external_image_id to generated_images
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS external_image_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- Update existing records to set provider
UPDATE generated_images
SET provider = 'openai', external_image_id = openai_image_id
WHERE openai_image_id IS NOT NULL AND external_image_id IS NULL;

-- Create index for provider
CREATE INDEX IF NOT EXISTS idx_generated_images_provider ON generated_images(provider);
CREATE INDEX IF NOT EXISTS idx_generated_images_character_id ON generated_images(character_id);

-- Add comment
COMMENT ON COLUMN generated_images.provider IS 'Image generation provider: openai, higgsfield, etc.';
COMMENT ON COLUMN generated_images.external_image_id IS 'Provider-specific image ID (replaces openai_image_id)';
COMMENT ON COLUMN generated_images.character_id IS 'Associated character ID for character-specific image generation';
