-- リレーショナルテーブル設計
-- RDFトリプルストアから通常のPostgreSQLテーブル設計への移行

-- Projects テーブル
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stories テーブル
CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scripts テーブル（storiesへの外部キー）
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    script_text TEXT NOT NULL,
    derived_from_story TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_script_story FOREIGN KEY (derived_from_story) REFERENCES stories(id) ON DELETE CASCADE
);

-- EPUB Documents テーブル
CREATE TABLE IF NOT EXISTS epub_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    metadata_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kindle Documents テーブル
CREATE TABLE IF NOT EXISTS kindle_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    metadata_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metadata テーブル（epub_documents/kindle_documentsへの外部キー）
CREATE TABLE IF NOT EXISTS metadata (
    id TEXT PRIMARY KEY,
    title TEXT,
    isbn TEXT,
    language TEXT,
    publisher TEXT,
    date TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EPUB Documents と Metadata の関連を更新
ALTER TABLE epub_documents 
    ADD CONSTRAINT fk_epub_metadata FOREIGN KEY (metadata_id) REFERENCES metadata(id) ON DELETE SET NULL;

ALTER TABLE kindle_documents 
    ADD CONSTRAINT fk_kindle_metadata FOREIGN KEY (metadata_id) REFERENCES metadata(id) ON DELETE SET NULL;

-- Chapters テーブル（epub_documents/kindle_documentsへの外部キー）
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    epub_document_id TEXT,
    kindle_document_id TEXT,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chapter_epub FOREIGN KEY (epub_document_id) REFERENCES epub_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_chapter_kindle FOREIGN KEY (kindle_document_id) REFERENCES kindle_documents(id) ON DELETE CASCADE,
    CONSTRAINT chk_chapter_document CHECK (
        (epub_document_id IS NOT NULL AND kindle_document_id IS NULL) OR 
        (epub_document_id IS NULL AND kindle_document_id IS NOT NULL)
    )
);

-- Sections テーブル（chaptersへの外部キー）
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_section_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Paragraphs テーブル（chapters/sectionsへの外部キー）
CREATE TABLE IF NOT EXISTS paragraphs (
    id TEXT PRIMARY KEY,
    chapter_id TEXT,
    section_id TEXT,
    "order" INTEGER NOT NULL,
    style TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_paragraph_chapter FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    CONSTRAINT fk_paragraph_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    CONSTRAINT chk_paragraph_parent CHECK (
        (chapter_id IS NOT NULL AND section_id IS NULL) OR 
        (chapter_id IS NULL AND section_id IS NOT NULL)
    )
);

-- Text Nodes テーブル（paragraphsへの外部キー）
CREATE TABLE IF NOT EXISTS text_nodes (
    id TEXT PRIMARY KEY,
    paragraph_id TEXT NOT NULL,
    content TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    style TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_textnode_paragraph FOREIGN KEY (paragraph_id) REFERENCES paragraphs(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_scripts_derived_from_story ON scripts(derived_from_story);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
CREATE INDEX IF NOT EXISTS idx_epub_documents_metadata ON epub_documents(metadata_id);
CREATE INDEX IF NOT EXISTS idx_kindle_documents_metadata ON kindle_documents(metadata_id);
CREATE INDEX IF NOT EXISTS idx_chapters_epub_document ON chapters(epub_document_id);
CREATE INDEX IF NOT EXISTS idx_chapters_kindle_document ON chapters(kindle_document_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order_epub ON chapters(epub_document_id, "order");
CREATE INDEX IF NOT EXISTS idx_chapters_order_kindle ON chapters(kindle_document_id, "order");
CREATE INDEX IF NOT EXISTS idx_sections_chapter ON sections(chapter_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON sections(chapter_id, "order");
CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter ON paragraphs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_section ON paragraphs(section_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_order ON paragraphs(COALESCE(chapter_id, section_id), "order");
CREATE INDEX IF NOT EXISTS idx_text_nodes_paragraph ON text_nodes(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_text_nodes_order ON text_nodes(paragraph_id, "order");
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- updated_at を自動更新する関数（既存の関数を再利用）
-- update_updated_at_column() 関数は既に 001_initial_schema.sql で定義されている

-- updated_at トリガー
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at
    BEFORE UPDATE ON scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_epub_documents_updated_at
    BEFORE UPDATE ON epub_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kindle_documents_updated_at
    BEFORE UPDATE ON kindle_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metadata_updated_at
    BEFORE UPDATE ON metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at
    BEFORE UPDATE ON paragraphs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_nodes_updated_at
    BEFORE UPDATE ON text_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

