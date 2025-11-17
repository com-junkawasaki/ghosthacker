// @context https://gftd.ai/ontology/epub-editor#
// @type cpm:System
// @id https://gftd.ai/performer/system/neo4j
//
// Neo4j schema definition for EPUB Editor Tool
// Creates indexes and constraints for optimal query performance

// Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS FOR (e:Epub) ON (e.id);
CREATE INDEX IF NOT EXISTS FOR (c:Chapter) ON (c.id);
CREATE INDEX IF NOT EXISTS FOR (p:Paragraph) ON (p.id);
CREATE INDEX IF NOT EXISTS FOR (m:Media) ON (m.id);
CREATE INDEX IF NOT EXISTS FOR (meta:Metadata) ON (meta.key);

// Create constraints for data integrity
CREATE CONSTRAINT IF NOT EXISTS FOR (e:Epub) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chapter) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (m:Media) REQUIRE m.id IS UNIQUE;

// Example queries for reference:

// Get EPUB with all chapters and metadata
// MATCH (e:Epub {id: $id})
// OPTIONAL MATCH (e)-[:HAS_CHAPTER]->(c:Chapter)
// OPTIONAL MATCH (e)-[:HAS_METADATA]->(meta:Metadata)
// RETURN e, collect(DISTINCT c) as chapters, collect(DISTINCT meta) as metadata

// Get chapter with paragraphs and media
// MATCH (c:Chapter {id: $id})
// OPTIONAL MATCH (c)-[:HAS_PARAGRAPH]->(p:Paragraph)
// OPTIONAL MATCH (c)-[:HAS_MEDIA]->(m:Media)
// RETURN c, collect(DISTINCT p) as paragraphs, collect(DISTINCT m) as media

// Get chapters in order
// MATCH (e:Epub {id: $epub_id})-[:HAS_CHAPTER]->(c:Chapter)
// RETURN c ORDER BY c.order ASC

