/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/export-types
 * 
 * Type definitions for EPUB export/import functionality
 */

/**
 * Tiptap JSON format (simplified structure)
 * Full structure matches Tiptap's JSONDocument type
 */
export interface TiptapJSON {
  type: string;
  content?: TiptapJSON[];
  attrs?: Record<string, unknown>;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  text?: string;
}

/**
 * Media item in export format
 */
export interface ExportMedia {
  id: string;
  type: string;
  url: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Metadata item in export format
 */
export interface ExportMetadata {
  key: string;
  value: string;
}

/**
 * Chapter in export format
 */
export interface ExportChapter {
  id: string;
  title: string;
  order: number;
  contentJson: TiptapJSON;
  media: ExportMedia[];
}

/**
 * EPUB in export format
 */
export interface ExportEpub {
  id: string;
  title: string;
  language: string;
  metadata: ExportMetadata[];
  chapters: ExportChapter[];
}

/**
 * Complete export file structure
 */
export interface ExportFile {
  version: string;
  exportedAt: string;
  epub: ExportEpub;
}

