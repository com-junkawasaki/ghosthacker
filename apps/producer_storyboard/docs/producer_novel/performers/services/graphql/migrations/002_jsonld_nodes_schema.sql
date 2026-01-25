-- JSON-LD Nodes schema for EPUB Editor
-- @context https://gftd.ai/ontology/epub-editor#
-- @type cpm:System
-- @id https://gftd.ai/performer/system/postgresql

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    callsign VARCHAR(255),
    description TEXT,
    age INTEGER,
    occupation VARCHAR(255),
    role VARCHAR(255),
    virtue VARCHAR(255),
    alternate_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_character_id ON characters(character_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

-- Ghosts table
CREATE TABLE IF NOT EXISTS ghosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ghost_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    ghost_type VARCHAR(100),
    description TEXT,
    master VARCHAR(255),
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ghosts_ghost_id ON ghosts(ghost_id);
CREATE INDEX IF NOT EXISTS idx_ghosts_name ON ghosts(name);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    year INTEGER,
    hazard_note TEXT,
    operational_note TEXT,
    security_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_location_id ON locations(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    founder VARCHAR(255),
    company_type VARCHAR(255),
    infra_note TEXT,
    operational_note TEXT,
    security_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_organization_id ON organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    founder VARCHAR(255),
    company_type VARCHAR(255),
    infra_note TEXT,
    operational_note TEXT,
    security_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Technologies table
CREATE TABLE IF NOT EXISTS technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    certification VARCHAR(255),
    infra_note TEXT,
    operational_note TEXT,
    security_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_technologies_technology_id ON technologies(technology_id);
CREATE INDEX IF NOT EXISTS idx_technologies_name ON technologies(name);

-- Episodes table
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id VARCHAR(255) NOT NULL UNIQUE,
    episode_number INTEGER NOT NULL,
    season VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    logline TEXT,
    has_arc BOOLEAN DEFAULT FALSE,
    has_scene BOOLEAN DEFAULT FALSE,
    has_character BOOLEAN DEFAULT FALSE,
    motif_refs JSONB,
    antagonist VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_episode_id ON episodes(episode_id);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_number ON episodes(episode_number);

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    same_as VARCHAR(500),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenes_scene_id ON scenes(scene_id);
CREATE INDEX IF NOT EXISTS idx_scenes_name ON scenes(name);

-- Arcs table
CREATE TABLE IF NOT EXISTS arcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arc_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    spans_seasons JSONB,
    phase VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arcs_arc_id ON arcs(arc_id);
CREATE INDEX IF NOT EXISTS idx_arcs_name ON arcs(name);

-- Motifs table
CREATE TABLE IF NOT EXISTS motifs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motif_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    theme VARCHAR(255),
    source VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motifs_motif_id ON motifs(motif_id);
CREATE INDEX IF NOT EXISTS idx_motifs_name ON motifs(name);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    theme VARCHAR(255),
    featured_themes JSONB,
    source VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasons_season_id ON seasons(season_id);
CREATE INDEX IF NOT EXISTS idx_seasons_name ON seasons(name);

-- Timelines table
CREATE TABLE IF NOT EXISTS timelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeline_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    influences JSONB,
    source VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timelines_timeline_id ON timelines(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timelines_name ON timelines(name);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    temporal_coverage VARCHAR(255),
    same_as JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);

-- Source references table
CREATE TABLE IF NOT EXISTS source_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_ref_id VARCHAR(255) NOT NULL UNIQUE,
    path VARCHAR(500) NOT NULL,
    lang VARCHAR(10) NOT NULL DEFAULT 'en',
    selection_hint VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_refs_source_ref_id ON source_refs(source_ref_id);
CREATE INDEX IF NOT EXISTS idx_source_refs_path ON source_refs(path);

-- Occupations table
CREATE TABLE IF NOT EXISTS occupations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occupation_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_occupations_occupation_id ON occupations(occupation_id);
CREATE INDEX IF NOT EXISTS idx_occupations_name ON occupations(name);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ghost_type VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_setting_id ON settings(setting_id);
CREATE INDEX IF NOT EXISTS idx_settings_name ON settings(name);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ghosts_updated_at ON ghosts;
CREATE TRIGGER update_ghosts_updated_at
    BEFORE UPDATE ON ghosts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_technologies_updated_at ON technologies;
CREATE TRIGGER update_technologies_updated_at
    BEFORE UPDATE ON technologies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_episodes_updated_at ON episodes;
CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenes_updated_at ON scenes;
CREATE TRIGGER update_scenes_updated_at
    BEFORE UPDATE ON scenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_arcs_updated_at ON arcs;
CREATE TRIGGER update_arcs_updated_at
    BEFORE UPDATE ON arcs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_motifs_updated_at ON motifs;
CREATE TRIGGER update_motifs_updated_at
    BEFORE UPDATE ON motifs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
CREATE TRIGGER update_seasons_updated_at
    BEFORE UPDATE ON seasons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timelines_updated_at ON timelines;
CREATE TRIGGER update_timelines_updated_at
    BEFORE UPDATE ON timelines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_source_refs_updated_at ON source_refs;
CREATE TRIGGER update_source_refs_updated_at
    BEFORE UPDATE ON source_refs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_occupations_updated_at ON occupations;
CREATE TRIGGER update_occupations_updated_at
    BEFORE UPDATE ON occupations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

