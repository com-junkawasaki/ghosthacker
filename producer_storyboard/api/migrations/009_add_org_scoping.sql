-- Add organization scoping to all tables for multi-tenant support
-- This migration adds org_id columns to all main tables to enable organization-based data access

-- Add org_id to storyboard_projects (top-level, all other tables inherit through relationships)
ALTER TABLE storyboard_projects
ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_storyboard_projects_org_id ON storyboard_projects(org_id);

-- Add org_id to storyboards (for direct access if needed)
ALTER TABLE storyboards
ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_storyboards_org_id ON storyboards(org_id);

-- Add org_id to scenes (for direct access if needed)
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_scenes_org_id ON scenes(org_id);

-- Add org_id to generated_videos
ALTER TABLE generated_videos
ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_generated_videos_org_id ON generated_videos(org_id);

-- Add org_id to characters
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_characters_org_id ON characters(org_id);

-- Add org_id to dialogues
ALTER TABLE dialogues
ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_dialogues_org_id ON dialogues(org_id);

-- Add org_id to operation_history if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operation_history') THEN
        ALTER TABLE operation_history
        ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);
        
        CREATE INDEX IF NOT EXISTS idx_operation_history_org_id ON operation_history(org_id);
    END IF;
END $$;

-- Add org_id to character_assets if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'character_assets') THEN
        ALTER TABLE character_assets
        ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);
        
        CREATE INDEX IF NOT EXISTS idx_character_assets_org_id ON character_assets(org_id);
    END IF;
END $$;

-- Add org_id to generated_images if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_images') THEN
        ALTER TABLE generated_images
        ADD COLUMN IF NOT EXISTS org_id VARCHAR(255);
        
        CREATE INDEX IF NOT EXISTS idx_generated_images_org_id ON generated_images(org_id);
    END IF;
END $$;

-- Create a function to propagate org_id from projects to child tables
-- This ensures data consistency when org_id is set on a project
CREATE OR REPLACE FUNCTION propagate_org_id_to_children()
RETURNS TRIGGER AS $$
BEGIN
    -- Update storyboards when project org_id changes
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        UPDATE storyboards
        SET org_id = NEW.org_id
        WHERE project_id = NEW.id;
        
        -- Update scenes through storyboards
        UPDATE scenes
        SET org_id = NEW.org_id
        WHERE storyboard_id IN (
            SELECT id FROM storyboards WHERE project_id = NEW.id
        );
        
        -- Update generated_videos through storyboards
        UPDATE generated_videos
        SET org_id = NEW.org_id
        WHERE storyboard_id IN (
            SELECT id FROM storyboards WHERE project_id = NEW.id
        );
        
        -- Update characters
        UPDATE characters
        SET org_id = NEW.org_id
        WHERE project_id = NEW.id;
        
        -- Update dialogues through scenes
        UPDATE dialogues
        SET org_id = NEW.org_id
        WHERE scene_id IN (
            SELECT id FROM scenes WHERE storyboard_id IN (
                SELECT id FROM storyboards WHERE project_id = NEW.id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate org_id changes
DROP TRIGGER IF EXISTS trigger_propagate_org_id ON storyboard_projects;
CREATE TRIGGER trigger_propagate_org_id
    AFTER UPDATE OF org_id ON storyboard_projects
    FOR EACH ROW
    EXECUTE FUNCTION propagate_org_id_to_children();

-- Add comment explaining the org_id column
COMMENT ON COLUMN storyboard_projects.org_id IS 'Clerk organization ID for multi-tenant data isolation';
COMMENT ON COLUMN storyboards.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN scenes.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN generated_videos.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN characters.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN dialogues.org_id IS 'Clerk organization ID (inherited from project)';
