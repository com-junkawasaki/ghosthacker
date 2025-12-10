-- Add operation history and generated images tables

-- Operation History Table
CREATE TABLE IF NOT EXISTS operation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'scene', 'storyboard', 'project'
    entity_id UUID NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'REORDER', 'GENERATE_IMAGE'
    operation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_history_entity ON operation_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON operation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_history_operation_type ON operation_history(operation_type);

-- Generated Images Table
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    openai_image_id VARCHAR(255),
    image_data BYTEA NOT NULL,
    image_format VARCHAR(20), -- 'png', 'jpeg', 'webp'
    prompt TEXT,
    model VARCHAR(50), -- 'dall-e-3', 'dall-e-2'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_scene_id ON generated_images(scene_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);


