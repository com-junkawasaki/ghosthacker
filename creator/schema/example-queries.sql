-- Example Queries for LLM RAG System
-- TypeDB ERA + pgvector PostgreSQL Implementation

-- ============================================
-- SETUP EXAMPLES
-- ============================================

-- Create a collection
INSERT INTO collections (collection_name, collection_description, metadata)
VALUES (
    'tech-docs',
    'Technical documentation collection',
    '{"category": "technical", "language": "en"}'::jsonb
)
RETURNING *;

-- Create a wasmCloud actor user
INSERT INTO users (actor_id, actor_name, metadata)
VALUES (
    'wasmcloud://rag/actor/1',
    'RAG Query Actor',
    '{"capabilities": ["query", "embed"]}'::jsonb
)
RETURNING *;

-- Grant user access to collection
INSERT INTO user_collections (user_id, collection_id, permission_level)
SELECT u.user_id, c.collection_id, 'read'
FROM users u, collections c
WHERE u.actor_id = 'wasmcloud://rag/actor/1'
  AND c.collection_name = 'tech-docs'
RETURNING *;

-- ============================================
-- DOCUMENT & CHUNK INSERTION
-- ============================================

-- Insert a document
INSERT INTO documents (
    collection_id,
    document_title,
    document_source,
    document_type,
    document_uri,
    metadata
)
SELECT 
    collection_id,
    'PostgreSQL Best Practices',
    'internal-wiki',
    'markdown',
    'https://wiki.example.com/postgresql-best-practices',
    '{"author": "admin", "tags": ["database", "postgresql"]}'::jsonb
FROM collections
WHERE collection_name = 'tech-docs'
RETURNING *;

-- Insert chunks for the document
WITH doc AS (
    SELECT document_id FROM documents WHERE document_title = 'PostgreSQL Best Practices'
)
INSERT INTO chunks (document_id, chunk_text, chunk_index, chunk_size, metadata)
SELECT 
    doc.document_id,
    unnest(ARRAY[
        'PostgreSQL is a powerful open-source relational database management system.',
        'It supports advanced features like JSON, full-text search, and vector similarity search with pgvector.',
        'Best practices include proper indexing, connection pooling, and query optimization.'
    ]),
    generate_series(0, 2),
    length(unnest(ARRAY[
        'PostgreSQL is a powerful open-source relational database management system.',
        'It supports advanced features like JSON, full-text search, and vector similarity search with pgvector.',
        'Best practices include proper indexing, connection pooling, and query optimization.'
    ])),
    '{"section": "introduction"}'::jsonb
FROM doc
RETURNING *;

-- ============================================
-- EMBEDDING INSERTION
-- ============================================

-- Insert embeddings (example with mock vectors)
-- In production, these would come from an embedding model API
INSERT INTO embeddings (chunk_id, embedding_model, embedding_dimension, embedding, metadata)
SELECT 
    c.chunk_id,
    'text-embedding-ada-002',
    1536,
    -- Mock embedding vectors (in production, use real embeddings)
    ('[' || array_to_string(
        ARRAY(SELECT (random() * 2 - 1)::numeric(10,6) FROM generate_series(1, 1536)),
        ','
    ) || ']')::vector(1536),
    '{"model_version": "002", "created_by": "wasmcloud-actor"}'::jsonb
FROM chunks c
JOIN documents d ON c.document_id = d.document_id
WHERE d.document_title = 'PostgreSQL Best Practices'
RETURNING embedding_id, chunk_id, embedding_model;

-- ============================================
-- VECTOR SIMILARITY SEARCH
-- ============================================

-- Example 1: Find similar chunks using the function
SELECT * FROM find_similar_chunks(
    p_query_vector := ('[' || array_to_string(
        ARRAY(SELECT (random() * 2 - 1)::numeric(10,6) FROM generate_series(1, 1536)),
        ','
    ) || ']')::vector(1536),
    p_collection_id := (SELECT collection_id FROM collections WHERE collection_name = 'tech-docs'),
    p_limit := 5,
    p_threshold := 0.7
);

-- Example 2: Direct vector similarity query
WITH query_embedding AS (
    SELECT ('[' || array_to_string(
        ARRAY(SELECT (random() * 2 - 1)::numeric(10,6) FROM generate_series(1, 1536)),
        ','
    ) || ']')::vector(1536) AS vec
)
SELECT 
    c.chunk_id,
    c.chunk_text,
    d.document_title,
    1 - (e.embedding <=> qe.vec) AS similarity_score
FROM query_embedding qe
CROSS JOIN embeddings e
JOIN chunks c ON e.chunk_id = c.chunk_id
JOIN documents d ON c.document_id = d.document_id
JOIN collections col ON d.collection_id = col.collection_id
WHERE col.collection_name = 'tech-docs'
  AND e.embedding_model = 'text-embedding-ada-002'
ORDER BY e.embedding <=> qe.vec
LIMIT 5;

-- Example 3: Hybrid search with metadata filtering
SELECT * FROM hybrid_search(
    p_query_vector := ('[' || array_to_string(
        ARRAY(SELECT (random() * 2 - 1)::numeric(10,6) FROM generate_series(1, 1536)),
        ','
    ) || ']')::vector(1536),
    p_collection_id := (SELECT collection_id FROM collections WHERE collection_name = 'tech-docs'),
    p_metadata_filter := '{"section": "introduction"}'::jsonb,
    p_limit := 10
);

-- ============================================
-- QUERY LOGGING
-- ============================================

-- Log a query
WITH query_vec AS (
    SELECT ('[' || array_to_string(
        ARRAY(SELECT (random() * 2 - 1)::numeric(10,6) FROM generate_series(1, 1536)),
        ','
    ) || ']')::vector(1536) AS vec
)
INSERT INTO queries (
    collection_id,
    query_text,
    query_vector,
    query_type,
    result_count,
    metadata
)
SELECT 
    (SELECT collection_id FROM collections WHERE collection_name = 'tech-docs'),
    'What are PostgreSQL best practices?',
    qv.vec,
    'similarity',
    5,
    '{"user_agent": "wasmcloud-actor", "session_id": "abc123"}'::jsonb
FROM query_vec qv
RETURNING *;

-- Store query results
WITH latest_query AS (
    SELECT query_id FROM queries ORDER BY created_at DESC LIMIT 1
),
similar_chunks AS (
    SELECT * FROM find_similar_chunks(
        p_query_vector := (SELECT query_vector FROM queries ORDER BY created_at DESC LIMIT 1),
        p_collection_id := (SELECT collection_id FROM collections WHERE collection_name = 'tech-docs'),
        p_limit := 5
    )
)
INSERT INTO query_results (query_id, chunk_id, similarity_score, rank)
SELECT 
    lq.query_id,
    sc.chunk_id,
    sc.similarity_score,
    ROW_NUMBER() OVER (ORDER BY sc.similarity_score DESC)::INTEGER AS rank
FROM latest_query lq
CROSS JOIN similar_chunks sc
RETURNING *;

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- Collection statistics
SELECT * FROM collection_stats
WHERE collection_name = 'tech-docs';

-- Most queried chunks
SELECT 
    c.chunk_id,
    c.chunk_text,
    COUNT(qr.query_id) AS query_count,
    AVG(qr.similarity_score) AS avg_similarity_score
FROM chunks c
JOIN query_results qr ON c.chunk_id = qr.chunk_id
GROUP BY c.chunk_id, c.chunk_text
ORDER BY query_count DESC
LIMIT 10;

-- Query performance over time
SELECT 
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS query_count,
    AVG(result_count) AS avg_results,
    COUNT(DISTINCT collection_id) AS collections_queried
FROM queries
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Find chunks without embeddings
SELECT 
    c.chunk_id,
    c.chunk_text,
    d.document_title
FROM chunks c
JOIN documents d ON c.document_id = d.document_id
LEFT JOIN embeddings e ON c.chunk_id = e.chunk_id
WHERE e.embedding_id IS NULL;

-- Find orphaned embeddings (chunks deleted but embeddings remain)
SELECT 
    e.embedding_id,
    e.chunk_id,
    e.embedding_model
FROM embeddings e
LEFT JOIN chunks c ON e.chunk_id = c.chunk_id
WHERE c.chunk_id IS NULL;

-- Collection cleanup (remove old queries)
DELETE FROM queries
WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- wasmCloud SPECIFIC QUERIES
-- ============================================

-- Get user's accessible collections
SELECT 
    c.collection_id,
    c.collection_name,
    uc.permission_level,
    cs.document_count,
    cs.chunk_count
FROM user_collections uc
JOIN collections c ON uc.collection_id = c.collection_id
JOIN collection_stats cs ON c.collection_id = cs.collection_id
WHERE uc.user_id = (SELECT user_id FROM users WHERE actor_id = 'wasmcloud://rag/actor/1');

-- Batch insert embeddings (for wasmCloud actor processing)
-- This would typically be called from a wasmCloud actor
CREATE OR REPLACE FUNCTION batch_insert_embeddings(
    p_chunk_embeddings JSONB
)
RETURNS TABLE (embedding_id UUID, chunk_id UUID) AS $$
DECLARE
    item JSONB;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_chunk_embeddings)
    LOOP
        INSERT INTO embeddings (
            chunk_id,
            embedding_model,
            embedding_dimension,
            embedding,
            metadata
        )
        VALUES (
            (item->>'chunk_id')::UUID,
            item->>'embedding_model',
            (item->>'embedding_dimension')::INTEGER,
            (item->>'embedding')::vector(1536),
            COALESCE(item->'metadata', '{}'::jsonb)
        )
        RETURNING embeddings.embedding_id, embeddings.chunk_id INTO embedding_id, chunk_id;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
