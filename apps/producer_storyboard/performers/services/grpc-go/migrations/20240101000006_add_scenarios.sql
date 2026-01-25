-- Scenario Management Tables

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    structure_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_org_id ON scenarios(org_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);

-- Episodes table (belongs to scenario)
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_scenario_id ON episodes(scenario_id);
CREATE INDEX IF NOT EXISTS idx_episodes_org_id ON episodes(org_id);
CREATE INDEX IF NOT EXISTS idx_episodes_order ON episodes(scenario_id, order_index);

-- Parts table (belongs to episode)
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parts_episode_id ON parts(episode_id);
CREATE INDEX IF NOT EXISTS idx_parts_org_id ON parts(org_id);
CREATE INDEX IF NOT EXISTS idx_parts_order ON parts(episode_id, order_index);

-- Scene Plans table (belongs to part)
CREATE TABLE IF NOT EXISTS scene_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    org_id VARCHAR(255),
    description TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scene_plans_part_id ON scene_plans(part_id);
CREATE INDEX IF NOT EXISTS idx_scene_plans_org_id ON scene_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_scene_plans_order ON scene_plans(part_id, order_index);

-- Add comments
COMMENT ON TABLE scenarios IS 'Story scenarios for planning story structure';
COMMENT ON TABLE episodes IS 'Episodes within a scenario';
COMMENT ON TABLE parts IS 'Parts within an episode';
COMMENT ON TABLE scene_plans IS 'Scene plans within a part';

-- Create function to propagate org_id from projects to scenarios
CREATE OR REPLACE FUNCTION propagate_org_id_to_scenarios()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        UPDATE scenarios SET org_id = NEW.org_id WHERE project_id = NEW.id;
        UPDATE episodes SET org_id = NEW.org_id WHERE scenario_id IN (SELECT id FROM scenarios WHERE project_id = NEW.id);
        UPDATE parts SET org_id = NEW.org_id WHERE episode_id IN (SELECT id FROM episodes WHERE scenario_id IN (SELECT id FROM scenarios WHERE project_id = NEW.id));
        UPDATE scene_plans SET org_id = NEW.org_id WHERE part_id IN (SELECT id FROM parts WHERE episode_id IN (SELECT id FROM episodes WHERE scenario_id IN (SELECT id FROM scenarios WHERE project_id = NEW.id)));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate org_id changes
DROP TRIGGER IF EXISTS trigger_propagate_org_id_to_scenarios ON storyboard_projects;
CREATE TRIGGER trigger_propagate_org_id_to_scenarios
    AFTER UPDATE OF org_id ON storyboard_projects
    FOR EACH ROW
    EXECUTE FUNCTION propagate_org_id_to_scenarios();

-- Add org_id comments
COMMENT ON COLUMN scenarios.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN episodes.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN parts.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN scene_plans.org_id IS 'Clerk organization ID (inherited from project)';
