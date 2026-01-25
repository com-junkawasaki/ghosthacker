-- Tags and Voice Presets Management Tables

-- Tags Table: Project-wide tags for resource categorization
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7), -- Hex color code (e.g., #3b82f6)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_project_id ON tags(project_id);
CREATE INDEX IF NOT EXISTS idx_tags_org_id ON tags(org_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Resource Tags Table: Many-to-many relationship between resources and tags
CREATE TABLE IF NOT EXISTS resource_tags (
    resource_type VARCHAR(50) NOT NULL, -- 'character', 'scenario', 'asset', 'location', etc.
    resource_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (resource_type, resource_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_tags_resource ON resource_tags(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_tag_id ON resource_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_org_id ON resource_tags(org_id);

-- Voice Presets Table: Hume AI voice preset management
CREATE TABLE IF NOT EXISTS voice_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    hume_voice_id VARCHAR(255) NOT NULL,
    description TEXT,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    sample_audio_id UUID REFERENCES project_assets(id) ON DELETE SET NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_presets_project_id ON voice_presets(project_id);
CREATE INDEX IF NOT EXISTS idx_voice_presets_org_id ON voice_presets(org_id);
CREATE INDEX IF NOT EXISTS idx_voice_presets_character_id ON voice_presets(character_id);
CREATE INDEX IF NOT EXISTS idx_voice_presets_hume_voice_id ON voice_presets(hume_voice_id);
CREATE INDEX IF NOT EXISTS idx_voice_presets_created_at ON voice_presets(created_at DESC);

-- Add comments
COMMENT ON TABLE tags IS 'Project-wide tags for resource categorization';
COMMENT ON TABLE resource_tags IS 'Many-to-many relationship between resources and tags';
COMMENT ON TABLE voice_presets IS 'Hume AI voice preset management';
COMMENT ON COLUMN tags.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN resource_tags.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN voice_presets.org_id IS 'Clerk organization ID (inherited from project)';

-- Create function to propagate org_id from projects to tags and voice_presets
CREATE OR REPLACE FUNCTION propagate_org_id_to_tags_and_voice_presets()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        UPDATE tags SET org_id = NEW.org_id WHERE project_id = NEW.id;
        UPDATE resource_tags SET org_id = NEW.org_id WHERE resource_id IN (
            SELECT id FROM characters WHERE project_id = NEW.id
            UNION
            SELECT id FROM scenarios WHERE project_id = NEW.id
            UNION
            SELECT id FROM project_assets WHERE project_id = NEW.id
            UNION
            SELECT id FROM locations WHERE project_id = NEW.id
        );
        UPDATE voice_presets SET org_id = NEW.org_id WHERE project_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate org_id changes
DROP TRIGGER IF EXISTS trigger_propagate_org_id_to_tags_and_voice_presets ON storyboard_projects;
CREATE TRIGGER trigger_propagate_org_id_to_tags_and_voice_presets
    AFTER UPDATE OF org_id ON storyboard_projects
    FOR EACH ROW
    EXECUTE FUNCTION propagate_org_id_to_tags_and_voice_presets();
