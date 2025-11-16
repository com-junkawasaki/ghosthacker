-- RDF/SHACL/JSON-LD ベースのスキーマ
-- PostgreSQL に RDF トリプルを正規化テーブル構造で保存

-- RDF リソースメタデータテーブル
CREATE TABLE IF NOT EXISTS rdf_resources (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RDF トリプルテーブル
CREATE TABLE IF NOT EXISTS rdf_triples (
    id BIGSERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    object_type TEXT NOT NULL DEFAULT 'literal', -- 'literal', 'uri', 'bnode'
    graph TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_subject FOREIGN KEY (subject) REFERENCES rdf_resources(id) ON DELETE CASCADE
);

-- JSON-LD コンテキストテーブル
CREATE TABLE IF NOT EXISTS rdf_contexts (
    id TEXT PRIMARY KEY,
    context JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SHACL シェイプ定義テーブル
CREATE TABLE IF NOT EXISTS shacl_shapes (
    id TEXT PRIMARY KEY,
    shape JSONB NOT NULL,
    target_class TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_rdf_triples_subject ON rdf_triples(subject);
CREATE INDEX IF NOT EXISTS idx_rdf_triples_predicate ON rdf_triples(predicate);
CREATE INDEX IF NOT EXISTS idx_rdf_triples_object ON rdf_triples(object);
CREATE INDEX IF NOT EXISTS idx_rdf_triples_graph ON rdf_triples(graph);
CREATE INDEX IF NOT EXISTS idx_rdf_resources_type ON rdf_resources(type);
CREATE INDEX IF NOT EXISTS idx_shacl_shapes_target_class ON shacl_shapes(target_class);

-- トリプル検索用の複合インデックス
CREATE INDEX IF NOT EXISTS idx_rdf_triples_sp ON rdf_triples(subject, predicate);
CREATE INDEX IF NOT EXISTS idx_rdf_triples_po ON rdf_triples(predicate, object);

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガー
CREATE TRIGGER update_rdf_resources_updated_at
    BEFORE UPDATE ON rdf_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rdf_contexts_updated_at
    BEFORE UPDATE ON rdf_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shacl_shapes_updated_at
    BEFORE UPDATE ON shacl_shapes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

