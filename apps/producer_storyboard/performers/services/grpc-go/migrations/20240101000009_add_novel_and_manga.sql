-- Novel and Manga Database Schema

-- Novel Projects
CREATE TABLE IF NOT EXISTS novel_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(10) DEFAULT 'ja',
    org_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_novel_projects_project_id ON novel_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_novel_projects_org_id ON novel_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_novel_projects_created_at ON novel_projects(created_at DESC);

-- Novel Chapters
CREATE TABLE IF NOT EXISTS novel_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_project_id UUID NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    content_html TEXT,
    content_json TEXT, -- Tiptap JSON format
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_novel_chapters_novel_project_id ON novel_chapters(novel_project_id);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_order_index ON novel_chapters(novel_project_id, order_index);

-- JSON-LD Nodes
CREATE TABLE IF NOT EXISTS jsonld_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_project_id UUID NOT NULL REFERENCES novel_projects(id) ON DELETE CASCADE,
    node_type VARCHAR(50) NOT NULL, -- 'character', 'ghost', 'location', etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    attributes_json JSONB DEFAULT '{}'::jsonb,
    image_base64 TEXT, -- Base64-encoded image for character nodes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jsonld_nodes_novel_project_id ON jsonld_nodes(novel_project_id);
CREATE INDEX IF NOT EXISTS idx_jsonld_nodes_node_type ON jsonld_nodes(novel_project_id, node_type);
CREATE INDEX IF NOT EXISTS idx_jsonld_nodes_name ON jsonld_nodes(novel_project_id, name);

-- Emotion Profiles
CREATE TABLE IF NOT EXISTS emotion_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL, -- Can reference chapter or jsonld_node
    node_type VARCHAR(50) NOT NULL, -- 'chapter', 'character', 'scene', etc.
    joy DOUBLE PRECISION DEFAULT 0.0,
    sadness DOUBLE PRECISION DEFAULT 0.0,
    fear DOUBLE PRECISION DEFAULT 0.0,
    anger DOUBLE PRECISION DEFAULT 0.0,
    surprise DOUBLE PRECISION DEFAULT 0.0,
    trust DOUBLE PRECISION DEFAULT 0.0,
    anticipation DOUBLE PRECISION DEFAULT 0.0,
    disgust DOUBLE PRECISION DEFAULT 0.0,
    relief DOUBLE PRECISION DEFAULT 0.0,
    hope DOUBLE PRECISION DEFAULT 0.0,
    emotion_vector_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(node_id, node_type)
);

CREATE INDEX IF NOT EXISTS idx_emotion_profiles_node_id ON emotion_profiles(node_id, node_type);

-- Manga Projects
CREATE TABLE IF NOT EXISTS manga_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES storyboard_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    org_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_manga_projects_project_id ON manga_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_manga_projects_org_id ON manga_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_manga_projects_created_at ON manga_projects(created_at DESC);

-- Manga Pages
CREATE TABLE IF NOT EXISTS manga_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manga_project_id UUID NOT NULL REFERENCES manga_projects(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    konva_stage_json TEXT, -- Konva Stage JSON for canvas state
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manga_pages_manga_project_id ON manga_pages(manga_project_id);
CREATE INDEX IF NOT EXISTS idx_manga_pages_page_number ON manga_pages(manga_project_id, page_number);

-- Manga Panels
CREATE TABLE IF NOT EXISTS manga_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES manga_pages(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    x DOUBLE PRECISION DEFAULT 0.0,
    y DOUBLE PRECISION DEFAULT 0.0,
    width DOUBLE PRECISION DEFAULT 0.0,
    height DOUBLE PRECISION DEFAULT 0.0,
    layout_type VARCHAR(50), -- 'grid', 'freeform', etc.
    prompt TEXT, -- Story prompt for this panel
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manga_panels_page_id ON manga_panels(page_id);
CREATE INDEX IF NOT EXISTS idx_manga_panels_order_index ON manga_panels(page_id, order_index);

-- Speech Bubbles
CREATE TABLE IF NOT EXISTS speech_bubbles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id UUID NOT NULL REFERENCES manga_panels(id) ON DELETE CASCADE,
    bubble_type VARCHAR(20) NOT NULL DEFAULT 'speech', -- 'speech', 'thought', 'shout'
    text TEXT NOT NULL,
    speaker VARCHAR(255), -- Character name
    x DOUBLE PRECISION DEFAULT 0.0,
    y DOUBLE PRECISION DEFAULT 0.0,
    width DOUBLE PRECISION DEFAULT 0.0,
    height DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speech_bubbles_panel_id ON speech_bubbles(panel_id);

-- Generated Images for Manga (stored as bytea)
CREATE TABLE IF NOT EXISTS manga_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manga_project_id UUID NOT NULL REFERENCES manga_projects(id) ON DELETE CASCADE,
    panel_id UUID REFERENCES manga_panels(id) ON DELETE SET NULL,
    image_data BYTEA NOT NULL,
    image_format VARCHAR(10) NOT NULL DEFAULT 'png', -- 'png', 'jpeg', etc.
    width INTEGER,
    height INTEGER,
    prompt TEXT,
    model VARCHAR(255), -- AI model used
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manga_generated_images_manga_project_id ON manga_generated_images(manga_project_id);
CREATE INDEX IF NOT EXISTS idx_manga_generated_images_panel_id ON manga_generated_images(panel_id);
CREATE INDEX IF NOT EXISTS idx_manga_generated_images_created_at ON manga_generated_images(created_at DESC);

-- Add org_id propagation for novel and manga projects
CREATE OR REPLACE FUNCTION propagate_org_id_to_novel_and_manga()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
        UPDATE novel_projects SET org_id = NEW.org_id WHERE project_id = NEW.id;
        UPDATE manga_projects SET org_id = NEW.org_id WHERE project_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically propagate org_id changes
DROP TRIGGER IF EXISTS trigger_propagate_org_id_to_novel_and_manga ON storyboard_projects;
CREATE TRIGGER trigger_propagate_org_id_to_novel_and_manga
    AFTER UPDATE OF org_id ON storyboard_projects
    FOR EACH ROW
    EXECUTE FUNCTION propagate_org_id_to_novel_and_manga();

-- Add comments
COMMENT ON COLUMN novel_projects.org_id IS 'Clerk organization ID (inherited from project)';
COMMENT ON COLUMN manga_projects.org_id IS 'Clerk organization ID (inherited from project)';
