-- PostgreSQL Schema for LLM RAG System with pgvector
-- TypeDB ERA Model Implementation
-- Designed for wasmCloud deployment

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- COLLECTIONS TABLE (Collection Entity)
-- ============================================
CREATE TABLE collections (
    collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_name VARCHAR(255) NOT NULL,
    collection_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT collections_name_unique UNIQUE (collection_name)
);

CREATE INDEX idx_collections_name ON collections(collection_name);
CREATE INDEX idx_collections_created_at ON collections(created_at);

-- ============================================
-- USERS TABLE (User Entity - wasmCloud Actors)
-- ============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(255) NOT NULL UNIQUE,
    actor_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_actor_id ON users(actor_id);

-- ============================================
-- USER_COLLECTIONS TABLE (User-Collection Relation)
-- ============================================
CREATE TABLE user_collections (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    permission_level VARCHAR(50) DEFAULT 'read',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, collection_id),
    CONSTRAINT permission_level_check CHECK (permission_level IN ('read', 'write', 'admin'))
);

CREATE INDEX idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX idx_user_collections_collection_id ON user_collections(collection_id);

-- ============================================
-- DOCUMENTS TABLE (Document Entity)
-- ============================================
CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(collection_id) ON DELETE CASCADE,
    document_title VARCHAR(500),
    document_source VARCHAR(500),
    document_type VARCHAR(100),
    document_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_documents_collection_id ON documents(collection_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);

-- ============================================
-- CHUNKS TABLE (Chunk Entity)
-- ============================================
CREATE TABLE chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chunks_document_index_unique UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_chunk_index ON chunks(chunk_index);
CREATE INDEX idx_chunks_metadata ON chunks USING GIN(metadata);

-- ============================================
-- EMBEDDINGS TABLE (Embedding Entity)
-- ============================================
CREATE TABLE embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES chunks(chunk_id) ON DELETE CASCADE,
    embedding_model VARCHAR(255) NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    embedding vector(1536) NOT NULL, -- Default: OpenAI ada-002 (1536 dims)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT embeddings_chunk_model_unique UNIQUE (chunk_id, embedding_model)
);

-- Vector similarity search indexes
-- HNSW index for approximate nearest neighbor search (better performance)
CREATE INDEX idx_embeddings_hnsw ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- IVFFlat index alternative (faster build, less memory)
-- CREATE INDEX idx_embeddings_ivfflat ON embeddings 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

CREATE INDEX idx_embeddings_chunk_id ON embeddings(chunk_id);
CREATE INDEX idx_embeddings_model ON embeddings(embedding_model);
CREATE INDEX idx_embeddings_metadata ON embeddings USING GIN(metadata);

-- ============================================
-- CHUNK_SEQUENCES TABLE (Chunk Sequence Relation)
-- ============================================
CREATE TABLE chunk_sequences (
    previous_chunk_id UUID NOT NULL REFERENCES chunks(chunk_id) ON DELETE CASCADE,
    next_chunk_id UUID NOT NULL REFERENCES chunks(chunk_id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    PRIMARY KEY (previous_chunk_id, next_chunk_id)
);

CREATE INDEX idx_chunk_sequences_previous ON chunk_sequences(previous_chunk_id);
CREATE INDEX idx_chunk_sequences_next ON chunk_sequences(next_chunk_id);

-- ============================================
-- QUERIES TABLE (Query Entity)
-- ============================================
CREATE TABLE queries (
    query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES collections(collection_id) ON DELETE SET NULL,
    query_text TEXT,
    query_vector vector(1536),
    query_type VARCHAR(50) DEFAULT 'similarity',
    result_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT query_type_check CHECK (query_type IN ('similarity', 'hybrid', 'keyword'))
);

CREATE INDEX idx_queries_collection_id ON queries(collection_id);
CREATE INDEX idx_queries_created_at ON queries(created_at);
CREATE INDEX idx_queries_type ON queries(query_type);

-- ============================================
-- QUERY_RESULTS TABLE (Query Result Relation)
-- ============================================
CREATE TABLE query_results (
    query_id UUID NOT NULL REFERENCES queries(query_id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES chunks(chunk_id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (query_id, chunk_id)
);

CREATE INDEX idx_query_results_query_id ON query_results(query_id);
CREATE INDEX idx_query_results_chunk_id ON query_results(chunk_id);
CREATE INDEX idx_query_results_score ON query_results(similarity_score DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VECTOR SIMILARITY SEARCH FUNCTIONS
-- ============================================

-- Function: Find similar chunks by vector similarity
CREATE OR REPLACE FUNCTION find_similar_chunks(
    p_query_vector vector(1536),
    p_collection_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_threshold DOUBLE PRECISION DEFAULT 0.0,
    p_embedding_model VARCHAR(255) DEFAULT 'text-embedding-ada-002'
)
RETURNS TABLE (
    chunk_id UUID,
    chunk_text TEXT,
    document_id UUID,
    document_title VARCHAR(500),
    similarity_score DOUBLE PRECISION,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.chunk_id,
        c.chunk_text,
        c.document_id,
        d.document_title,
        1 - (e.embedding <=> p_query_vector) AS similarity_score,
        c.metadata
    FROM embeddings e
    JOIN chunks c ON e.chunk_id = c.chunk_id
    JOIN documents d ON c.document_id = d.document_id
    WHERE e.embedding_model = p_embedding_model
        AND (p_collection_id IS NULL OR d.collection_id = p_collection_id)
        AND (1 - (e.embedding <=> p_query_vector)) >= p_threshold
    ORDER BY e.embedding <=> p_query_vector
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Hybrid search (vector + metadata filtering)
CREATE OR REPLACE FUNCTION hybrid_search(
    p_query_vector vector(1536),
    p_collection_id UUID DEFAULT NULL,
    p_metadata_filter JSONB DEFAULT '{}'::jsonb,
    p_limit INTEGER DEFAULT 10,
    p_embedding_model VARCHAR(255) DEFAULT 'text-embedding-ada-002'
)
RETURNS TABLE (
    chunk_id UUID,
    chunk_text TEXT,
    document_id UUID,
    document_title VARCHAR(500),
    similarity_score DOUBLE PRECISION,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.chunk_id,
        c.chunk_text,
        c.document_id,
        d.document_title,
        1 - (e.embedding <=> p_query_vector) AS similarity_score,
        c.metadata
    FROM embeddings e
    JOIN chunks c ON e.chunk_id = c.chunk_id
    JOIN documents d ON c.document_id = d.document_id
    WHERE e.embedding_model = p_embedding_model
        AND (p_collection_id IS NULL OR d.collection_id = p_collection_id)
        AND (p_metadata_filter = '{}'::jsonb OR c.metadata @> p_metadata_filter)
    ORDER BY e.embedding <=> p_query_vector
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View: Complete chunk information with embeddings
CREATE VIEW chunk_embeddings_view AS
SELECT 
    c.chunk_id,
    c.document_id,
    c.chunk_text,
    c.chunk_index,
    c.chunk_size,
    c.metadata AS chunk_metadata,
    d.document_title,
    d.document_type,
    d.collection_id,
    e.embedding_id,
    e.embedding_model,
    e.embedding_dimension,
    e.embedding,
    e.metadata AS embedding_metadata,
    c.created_at AS chunk_created_at,
    e.created_at AS embedding_created_at
FROM chunks c
JOIN documents d ON c.document_id = d.document_id
LEFT JOIN embeddings e ON c.chunk_id = e.chunk_id;

-- View: Collection statistics
CREATE VIEW collection_stats AS
SELECT 
    col.collection_id,
    col.collection_name,
    COUNT(DISTINCT d.document_id) AS document_count,
    COUNT(DISTINCT c.chunk_id) AS chunk_count,
    COUNT(DISTINCT e.embedding_id) AS embedding_count,
    COUNT(DISTINCT uc.user_id) AS user_count,
    MAX(d.created_at) AS last_document_added
FROM collections col
LEFT JOIN documents d ON col.collection_id = d.collection_id
LEFT JOIN chunks c ON d.document_id = c.document_id
LEFT JOIN embeddings e ON c.chunk_id = e.chunk_id
LEFT JOIN user_collections uc ON col.collection_id = uc.collection_id
GROUP BY col.collection_id, col.collection_name;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE collections IS 'Collection Entity: コレクション/名前空間';
COMMENT ON TABLE users IS 'User Entity: wasmCloudアクター';
COMMENT ON TABLE documents IS 'Document Entity: 元のドキュメント';
COMMENT ON TABLE chunks IS 'Chunk Entity: ドキュメントのチャンク';
COMMENT ON TABLE embeddings IS 'Embedding Entity: ベクトル埋め込み (pgvector使用)';
COMMENT ON TABLE queries IS 'Query Entity: 検索クエリの記録';
COMMENT ON TABLE query_results IS 'Query Result Relation: クエリ結果';

COMMENT ON COLUMN embeddings.embedding IS 'pgvector型: ベクトル埋め込み (デフォルト1536次元)';
COMMENT ON INDEX idx_embeddings_hnsw IS 'HNSW index for approximate nearest neighbor search';
COMMENT ON FUNCTION find_similar_chunks IS 'ベクトル類似度検索関数';
COMMENT ON FUNCTION hybrid_search IS 'ハイブリッド検索関数 (ベクトル + メタデータ)';
