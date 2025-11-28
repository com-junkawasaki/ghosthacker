-- PostgreSQL Schema Extensions for Unified IR (Symbolic + Graph + Vector)
-- JSON-LD based Integrated Representation System

-- ============================================
-- EXTEND EXISTING TABLES
-- ============================================

-- Add JSON-LD IR support to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS jsonld_content JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ir_type VARCHAR(50);

CREATE INDEX idx_documents_ir_type ON documents(ir_type);
CREATE INDEX idx_documents_jsonld_content ON documents USING GIN(jsonld_content);

-- Add JSON-LD context to chunks table
ALTER TABLE chunks
ADD COLUMN IF NOT EXISTS jsonld_context JSONB DEFAULT '{}'::jsonb;

CREATE INDEX idx_chunks_jsonld_context ON chunks USING GIN(jsonld_context);

-- ============================================
-- IR ENTITIES TABLE (Normalized Entity Storage)
-- ============================================

CREATE TABLE ir_entities (
    entity_id VARCHAR(255) PRIMARY KEY,  -- @id from JSON-LD
    entity_type VARCHAR(50) NOT NULL,    -- @type from JSON-LD
    name VARCHAR(500),
    document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
    jsonld_data JSONB NOT NULL,          -- Full JSON-LD entity
    llm_label TEXT,
    embed_hint TEXT,
    image_prompt TEXT,
    video_prompt TEXT,
    embedding_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ir_entities_type ON ir_entities(entity_type);
CREATE INDEX idx_ir_entities_document_id ON ir_entities(document_id);
CREATE INDEX idx_ir_entities_embedding_id ON ir_entities(embedding_id);
CREATE INDEX idx_ir_entities_jsonld_data ON ir_entities USING GIN(jsonld_data);
CREATE INDEX idx_ir_entities_name ON ir_entities(name);

-- ============================================
-- IR RELATIONS TABLE (Graph Structure)
-- ============================================

CREATE TABLE ir_relations (
    relation_id VARCHAR(255) PRIMARY KEY,  -- @id from JSON-LD
    relation_type VARCHAR(50) NOT NULL,    -- relationType
    from_entity_id VARCHAR(255) NOT NULL REFERENCES ir_entities(entity_id) ON DELETE CASCADE,
    to_entity_id VARCHAR(255) NOT NULL REFERENCES ir_entities(entity_id) ON DELETE CASCADE,
    scene_id VARCHAR(255),                 -- Scene @id where relation appears
    strength DOUBLE PRECISION,            -- 0-1 relation strength
    jsonld_data JSONB NOT NULL,            -- Full JSON-LD relation
    llm_label TEXT,
    embed_hint TEXT,
    embedding_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ir_relations_type ON ir_relations(relation_type);
CREATE INDEX idx_ir_relations_from ON ir_relations(from_entity_id);
CREATE INDEX idx_ir_relations_to ON ir_relations(to_entity_id);
CREATE INDEX idx_ir_relations_scene ON ir_relations(scene_id);
CREATE INDEX idx_ir_relations_embedding_id ON ir_relations(embedding_id);
CREATE INDEX idx_ir_relations_jsonld_data ON ir_relations USING GIN(jsonld_data);

-- ============================================
-- IR EMBEDDINGS MAPPING TABLE
-- ============================================

CREATE TABLE ir_embeddings (
    embedding_mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(255) REFERENCES ir_entities(entity_id) ON DELETE CASCADE,
    relation_id VARCHAR(255) REFERENCES ir_relations(relation_id) ON DELETE CASCADE,
    embedding_id UUID NOT NULL REFERENCES embeddings(embedding_id) ON DELETE CASCADE,
    embedding_source VARCHAR(50) NOT NULL,  -- 'llmLabel', 'embedHint', 'imagePrompt', 'videoPrompt'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ir_embeddings_entity_or_relation CHECK (
        (entity_id IS NOT NULL AND relation_id IS NULL) OR
        (entity_id IS NULL AND relation_id IS NOT NULL)
    )
);

CREATE INDEX idx_ir_embeddings_entity_id ON ir_embeddings(entity_id);
CREATE INDEX idx_ir_embeddings_relation_id ON ir_embeddings(relation_id);
CREATE INDEX idx_ir_embeddings_embedding_id ON ir_embeddings(embedding_id);
CREATE INDEX idx_ir_embeddings_source ON ir_embeddings(embedding_source);

-- ============================================
-- FUNCTIONS: Graph Traversal
-- ============================================

-- Find all entities related to a given entity
CREATE OR REPLACE FUNCTION find_related_entities(
    p_entity_id VARCHAR(255),
    p_relation_type VARCHAR(50) DEFAULT NULL,
    p_max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    entity_id VARCHAR(255),
    entity_type VARCHAR(50),
    name VARCHAR(500),
    relation_path TEXT,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE entity_graph AS (
        -- Start with the given entity
        SELECT 
            p_entity_id::VARCHAR(255) AS entity_id,
            0 AS depth,
            ARRAY[p_entity_id::TEXT] AS path
        UNION ALL
        -- Find related entities
        SELECT 
            CASE 
                WHEN r.from_entity_id = eg.entity_id THEN r.to_entity_id
                ELSE r.from_entity_id
            END AS entity_id,
            eg.depth + 1 AS depth,
            eg.path || CASE 
                WHEN r.from_entity_id = eg.entity_id THEN r.to_entity_id
                ELSE r.from_entity_id
            END::TEXT AS path
        FROM entity_graph eg
        JOIN ir_relations r ON (
            (r.from_entity_id = eg.entity_id OR r.to_entity_id = eg.entity_id)
            AND (p_relation_type IS NULL OR r.relation_type = p_relation_type)
            AND NOT (CASE 
                WHEN r.from_entity_id = eg.entity_id THEN r.to_entity_id
                ELSE r.from_entity_id
            END = ANY(eg.path))  -- Avoid cycles
        )
        WHERE eg.depth < p_max_depth
    )
    SELECT DISTINCT
        e.entity_id,
        e.entity_type,
        e.name,
        array_to_string(eg.path, ' -> ') AS relation_path,
        eg.depth
    FROM entity_graph eg
    JOIN ir_entities e ON e.entity_id = eg.entity_id
    WHERE eg.depth > 0
    ORDER BY eg.depth, e.name;
END;
$$ LANGUAGE plpgsql;

-- Query graph by relation type
CREATE OR REPLACE FUNCTION query_graph(
    p_entity_id VARCHAR(255),
    p_relation_type VARCHAR(50)
)
RETURNS TABLE (
    from_entity_id VARCHAR(255),
    from_entity_type VARCHAR(50),
    from_name VARCHAR(500),
    relation_type VARCHAR(50),
    to_entity_id VARCHAR(255),
    to_entity_type VARCHAR(50),
    to_name VARCHAR(500),
    strength DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.from_entity_id,
        e_from.entity_type,
        e_from.name,
        r.relation_type,
        r.to_entity_id,
        e_to.entity_type,
        e_to.name,
        r.strength
    FROM ir_relations r
    JOIN ir_entities e_from ON r.from_entity_id = e_from.entity_id
    JOIN ir_entities e_to ON r.to_entity_id = e_to.entity_id
    WHERE (r.from_entity_id = p_entity_id OR r.to_entity_id = p_entity_id)
      AND r.relation_type = p_relation_type
    ORDER BY r.strength DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS: IR Entity Management
-- ============================================

-- Save JSON-LD entity
CREATE OR REPLACE FUNCTION save_ir_entity(
    p_entity_id VARCHAR(255),
    p_entity_type VARCHAR(50),
    p_jsonld_data JSONB,
    p_document_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_doc_id UUID;
BEGIN
    -- Extract common fields from JSON-LD
    -- If document_id is provided, use it; otherwise create a new document
    IF p_document_id IS NULL THEN
        INSERT INTO documents (
            collection_id,
            document_title,
            document_type,
            ir_type,
            jsonld_content
        )
        VALUES (
            (SELECT collection_id FROM collections LIMIT 1),  -- Default collection
            COALESCE(p_jsonld_data->>'name', p_entity_id),
            'ir-entity',
            p_entity_type,
            jsonb_build_object('@id', p_entity_id, '@type', p_entity_type) || p_jsonld_data
        )
        RETURNING document_id INTO v_doc_id;
    ELSE
        v_doc_id := p_document_id;
        -- Update existing document
        UPDATE documents
        SET 
            jsonld_content = jsonld_content || jsonb_build_object('@id', p_entity_id, '@type', p_entity_type) || p_jsonld_data,
            ir_type = p_entity_type
        WHERE document_id = v_doc_id;
    END IF;
    
    -- Insert or update entity
    INSERT INTO ir_entities (
        entity_id,
        entity_type,
        name,
        document_id,
        jsonld_data,
        llm_label,
        embed_hint,
        image_prompt,
        video_prompt,
        embedding_id
    )
    VALUES (
        p_entity_id,
        p_entity_type,
        p_jsonld_data->>'name',
        v_doc_id,
        p_jsonld_data,
        p_jsonld_data->>'llmLabel',
        p_jsonld_data->>'embedHint',
        p_jsonld_data->>'imagePrompt',
        p_jsonld_data->>'videoPrompt',
        p_jsonld_data->>'embeddingId'
    )
    ON CONFLICT (entity_id) DO UPDATE SET
        entity_type = EXCLUDED.entity_type,
        name = EXCLUDED.name,
        jsonld_data = EXCLUDED.jsonld_data,
        llm_label = EXCLUDED.llm_label,
        embed_hint = EXCLUDED.embed_hint,
        image_prompt = EXCLUDED.image_prompt,
        video_prompt = EXCLUDED.video_prompt,
        embedding_id = EXCLUDED.embedding_id,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN v_doc_id;
END;
$$ LANGUAGE plpgsql;

-- Load IR entity
CREATE OR REPLACE FUNCTION load_ir_entity(p_entity_id VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    v_jsonld JSONB;
BEGIN
    SELECT jsonld_data INTO v_jsonld
    FROM ir_entities
    WHERE entity_id = p_entity_id;
    
    RETURN v_jsonld;
END;
$$ LANGUAGE plpgsql;

-- Save IR relation
CREATE OR REPLACE FUNCTION save_ir_relation(
    p_relation_id VARCHAR(255),
    p_relation_type VARCHAR(50),
    p_from_entity_id VARCHAR(255),
    p_to_entity_id VARCHAR(255),
    p_jsonld_data JSONB,
    p_scene_id VARCHAR(255) DEFAULT NULL,
    p_strength DOUBLE PRECISION DEFAULT NULL
)
RETURNS VARCHAR(255) AS $$
BEGIN
    INSERT INTO ir_relations (
        relation_id,
        relation_type,
        from_entity_id,
        to_entity_id,
        scene_id,
        strength,
        jsonld_data,
        llm_label,
        embed_hint,
        embedding_id
    )
    VALUES (
        p_relation_id,
        p_relation_type,
        p_from_entity_id,
        p_to_entity_id,
        p_scene_id,
        p_strength,
        p_jsonld_data,
        p_jsonld_data->>'llmLabel',
        p_jsonld_data->>'embedHint',
        p_jsonld_data->>'embeddingId'
    )
    ON CONFLICT (relation_id) DO UPDATE SET
        relation_type = EXCLUDED.relation_type,
        from_entity_id = EXCLUDED.from_entity_id,
        to_entity_id = EXCLUDED.to_entity_id,
        scene_id = EXCLUDED.scene_id,
        strength = EXCLUDED.strength,
        jsonld_data = EXCLUDED.jsonld_data,
        llm_label = EXCLUDED.llm_label,
        embed_hint = EXCLUDED.embed_hint,
        embedding_id = EXCLUDED.embedding_id;
    
    RETURN p_relation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS: Graph Structure
-- ============================================

-- Graph view of IR entities and relations
CREATE OR REPLACE VIEW ir_entities_graph_view AS
SELECT 
    e.entity_id AS node_id,
    e.entity_type AS node_type,
    e.name AS node_name,
    r.relation_id,
    r.relation_type,
    r.from_entity_id,
    r.to_entity_id,
    r.strength,
    r.scene_id,
    e.embedding_id AS entity_embedding_id,
    r.embedding_id AS relation_embedding_id
FROM ir_entities e
LEFT JOIN ir_relations r ON (
    r.from_entity_id = e.entity_id OR r.to_entity_id = e.entity_id
);

-- Entity with embeddings view
CREATE OR REPLACE VIEW ir_entities_with_embeddings AS
SELECT 
    e.entity_id,
    e.entity_type,
    e.name,
    e.llm_label,
    e.embed_hint,
    e.image_prompt,
    e.video_prompt,
    e.embedding_id,
    emb.embedding_id AS stored_embedding_id,
    emb.embedding,
    emb.embedding_model,
    emb.embedding_dimension
FROM ir_entities e
LEFT JOIN ir_embeddings ie ON e.entity_id = ie.entity_id
LEFT JOIN embeddings emb ON ie.embedding_id = emb.embedding_id;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ir_entity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ir_entities_updated_at
    BEFORE UPDATE ON ir_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_ir_entity_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE ir_entities IS 'JSON-LD Entityの正規化テーブル';
COMMENT ON TABLE ir_relations IS 'Relationの正規化テーブル（グラフ構造）';
COMMENT ON TABLE ir_embeddings IS 'Entity/RelationごとのembeddingIdマッピング';
COMMENT ON FUNCTION find_related_entities IS '指定Entityに関連するEntityをグラフ探索';
COMMENT ON FUNCTION query_graph IS '特定の関係型でグラフ探索';
COMMENT ON FUNCTION save_ir_entity IS 'JSON-LD Entityを保存';
COMMENT ON FUNCTION load_ir_entity IS 'Entityを読み込み';
COMMENT ON FUNCTION save_ir_relation IS 'JSON-LD Relationを保存';
