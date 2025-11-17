-- Graph schema for EPUB Editor (Incidence Graph Model)
-- @context https://gftd.ai/ontology/epub-editor#
-- @type cpm:System
-- @id https://gftd.ai/performer/system/postgresql
--
-- This schema extends the existing JSON-LD node tables (characters, ghosts, locations, etc.)
-- to work as nodes in an incidence graph model.
-- Existing JSON-LD node tables are used directly as nodes.
-- Only link and incidence tables are added here.

-- Graph Links table (Edges)
-- Represents relationships between nodes (e.g., worksFor, knows, parent, spouse)
CREATE TABLE IF NOT EXISTS graph_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Source node reference (polymorphic: references any node table)
    source_node_type VARCHAR(50) NOT NULL, -- 'character', 'ghost', 'location', etc.
    source_node_id UUID NOT NULL, -- References id column of source node table
    -- Target node reference (polymorphic: references any node table)
    target_node_type VARCHAR(50) NOT NULL, -- 'character', 'ghost', 'location', etc.
    target_node_id UUID NOT NULL, -- References id column of target node table
    -- Link properties
    link_type VARCHAR(100) NOT NULL, -- 'worksFor', 'knows', 'parent', 'spouse', 'sibling', 'colleague', 'master', 'createdBy', 'founder', etc.
    properties JSONB DEFAULT '{}'::jsonb, -- Additional properties for the link
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure source and target are different
    CONSTRAINT check_different_nodes CHECK (source_node_type != target_node_type OR source_node_id != target_node_id),
    -- Unique constraint: same source-target-link_type combination should be unique
    CONSTRAINT unique_link UNIQUE (source_node_type, source_node_id, target_node_type, target_node_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_graph_links_source ON graph_links(source_node_type, source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_links_target ON graph_links(target_node_type, target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_links_type ON graph_links(link_type);
CREATE INDEX IF NOT EXISTS idx_graph_links_properties ON graph_links USING GIN(properties);

-- Graph Incidences table
-- Represents the connection between nodes and links (incidence relation)
-- In an incidence graph, both nodes and links are first-class entities,
-- and incidences connect them with roles (source/target) and properties
CREATE TABLE IF NOT EXISTS graph_incidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Node reference (polymorphic: references any node table)
    node_type VARCHAR(50) NOT NULL, -- 'character', 'ghost', 'location', etc.
    node_id UUID NOT NULL, -- References id column of node table
    -- Link reference
    link_id UUID NOT NULL REFERENCES graph_links(id) ON DELETE CASCADE,
    -- Role in the link (e.g., 'source', 'target', 'participant')
    role VARCHAR(50) NOT NULL DEFAULT 'source', -- 'source', 'target', 'participant', etc.
    -- Incidence properties (e.g., weight, direction, metadata)
    properties JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Unique constraint: same node-link-role combination should be unique
    CONSTRAINT unique_incidence UNIQUE (node_type, node_id, link_id, role)
);

CREATE INDEX IF NOT EXISTS idx_graph_incidences_node ON graph_incidences(node_type, node_id);
CREATE INDEX IF NOT EXISTS idx_graph_incidences_link ON graph_incidences(link_id);
CREATE INDEX IF NOT EXISTS idx_graph_incidences_role ON graph_incidences(role);
CREATE INDEX IF NOT EXISTS idx_graph_incidences_properties ON graph_incidences USING GIN(properties);

-- Trigger for updated_at on graph_links
CREATE TRIGGER update_graph_links_updated_at
    BEFORE UPDATE ON graph_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on graph_incidences
CREATE TRIGGER update_graph_incidences_updated_at
    BEFORE UPDATE ON graph_incidences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper function to extract links from JSON-LD node relationships
-- This can be called to populate graph_links from existing JSON-LD node data
-- Example relationships:
-- - Character.worksFor -> Organization
-- - Character.knows -> Character[]
-- - Character.parent -> Character
-- - Character.spouse -> Character
-- - Character.sibling -> Character
-- - Character.colleague -> Character[]
-- - Ghost.master -> Character
-- - Ghost.createdBy -> Character
-- - Organization.founder -> Character

