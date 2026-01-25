-- Project Assets and Locations Management Tables

-- Project Assets Table: Project-wide media asset management
CREATE TABLE IF NOT EXISTS project_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'document')),
    asset_data BYTEA NOT NULL,
    asset_format VARCHAR(20),
    filename VARCHAR(255),
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_org_id ON project_assets(org_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_asset_type ON project_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_project_assets_created_at ON project_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_assets_tags ON project_assets USING GIN(tags);

-- Locations Table: Story locations/places management
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    image_id UUID REFERENCES project_assets(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_project_id ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);

-- Add comments
COMMENT ON TABLE project_assets IS 'Project-wide media assets (images, videos, audio, documents)';
COMMENT ON TABLE locations IS 'Story locations/places with hierarchical structure support';
COMMENT ON COLUMN project_assets.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN locations.org_id IS 'Clerk organization ID (inherited from project)';

-- Create function to propagate org_id from projects to project_assets and locations
CREATE OR REPLACE FUNCTION propagate_org_id_to_assets_and_locations()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        UPDATE project_assets SET org_id = NEW.org_id WHERE project_id = NEW.id;
        UPDATE locations SET org_id = NEW.org_id WHERE project_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate org_id changes
DROP TRIGGER IF EXISTS trigger_propagate_org_id_to_assets_and_locations ON storyboard_projects;
CREATE TRIGGER trigger_propagate_org_id_to_assets_and_locations
    AFTER UPDATE OF org_id ON storyboard_projects
    FOR EACH ROW
    EXECUTE FUNCTION propagate_org_id_to_assets_and_locations();
