-- Add image_base64 column to characters table
-- @context https://gftd.ai/ontology/epub-editor#
-- @type cpm:System
-- @id https://gftd.ai/performer/system/postgresql

-- Add image_base64 column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_base64 TEXT;

-- Add comment to document the column
COMMENT ON COLUMN characters.image_base64 IS 'Base64 encoded image data (data:image/{type};base64,{data} format)';

