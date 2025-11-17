-- Add tiptap_content column to epub_documents table
ALTER TABLE epub_documents ADD COLUMN IF NOT EXISTS tiptap_content JSONB;

-- Add tiptap_content column to kindle_documents table
ALTER TABLE kindle_documents ADD COLUMN IF NOT EXISTS tiptap_content JSONB;

