-- Graph RAG + Vector Search Support
-- PostgreSQL + pgvector拡張機能を使用したグラフ構造とベクトル検索のサポート

-- pgvector拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- グラフノードテーブル
CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    vector vector(3072), -- OpenAI text-embedding-3-largeの次元数
    jsonld JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- グラフエッジテーブル
CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    label TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_source_node FOREIGN KEY (source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_node FOREIGN KEY (target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON graph_nodes(label);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_properties ON graph_nodes USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_jsonld ON graph_nodes USING GIN(jsonld);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_label ON graph_edges(label);
CREATE INDEX IF NOT EXISTS idx_graph_edges_properties ON graph_edges USING GIN(properties);

-- ベクトル検索用インデックス
-- 注意: pgvectorのHNSW/ivfflatインデックスは2000次元までサポート
-- 3072次元（text-embedding-3-large）の場合はインデックスなしで検索
-- 必要に応じて、text-embedding-3-small（1536次元）を使用することを推奨
-- 3072次元のベクトルにはivfflatインデックスは使用できないため、コメントアウト
-- CREATE INDEX IF NOT EXISTS idx_graph_nodes_vector ON graph_nodes 
--     USING ivfflat (vector vector_cosine_ops)
--     WITH (lists = 100);

-- updated_at自動更新トリガー
CREATE TRIGGER update_graph_nodes_updated_at
    BEFORE UPDATE ON graph_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graph_edges_updated_at
    BEFORE UPDATE ON graph_edges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RDFトリプルとグラフノードの連携用ビュー
CREATE OR REPLACE VIEW graph_nodes_with_triples AS
SELECT 
    gn.id,
    gn.label,
    gn.properties,
    gn.vector,
    gn.jsonld,
    gn.created_at,
    gn.updated_at,
    COUNT(DISTINCT rt.id) as triple_count
FROM graph_nodes gn
LEFT JOIN rdf_triples rt ON rt.subject = gn.id OR rt.object = gn.id
GROUP BY gn.id, gn.label, gn.properties, gn.vector, gn.jsonld, gn.created_at, gn.updated_at;

-- ベクトル類似度検索用関数
CREATE OR REPLACE FUNCTION vector_similarity_search(
    query_vector vector(3072),
    limit_count INTEGER DEFAULT 10,
    threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id TEXT,
    label TEXT,
    properties JSONB,
    jsonld JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gn.id,
        gn.label,
        gn.properties,
        gn.jsonld,
        1 - (gn.vector <=> query_vector) as similarity
    FROM graph_nodes gn
    WHERE gn.vector IS NOT NULL
        AND (1 - (gn.vector <=> query_vector)) >= threshold
    ORDER BY gn.vector <=> query_vector
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

