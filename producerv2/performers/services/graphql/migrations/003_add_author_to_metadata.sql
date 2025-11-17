-- Add author column to metadata table
ALTER TABLE metadata ADD COLUMN IF NOT EXISTS author TEXT;

