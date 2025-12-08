-- Add image_type column to generated_images table
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS image_type VARCHAR(20) DEFAULT 'start'; -- 'start' or 'end'

CREATE INDEX IF NOT EXISTS idx_generated_images_scene_id_type ON generated_images(scene_id, image_type);

