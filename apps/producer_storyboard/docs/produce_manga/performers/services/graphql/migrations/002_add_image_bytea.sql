-- Migration: 002_add_image_bytea.sql
-- Add BYTEA columns for storing image binary data

-- Add image_data BYTEA column to manga_generated_images
ALTER TABLE manga_generated_images
ADD COLUMN IF NOT EXISTS image_data BYTEA;

-- Add image_data BYTEA column to manga_panels
ALTER TABLE manga_panels
ADD COLUMN IF NOT EXISTS image_data BYTEA;

-- Create index on image_data for faster queries (optional, but helpful for large images)
-- Note: BYTEA indexes are not very efficient, but we can index on project_id/panel_id instead
CREATE INDEX IF NOT EXISTS idx_manga_generated_images_project_panel 
ON manga_generated_images(project_id, panel_id) 
WHERE image_data IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manga_panels_image_data 
ON manga_panels(page_id) 
WHERE image_data IS NOT NULL;

