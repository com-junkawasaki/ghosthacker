// Neo4j schema initialization script
// This file is used for manual initialization via cypher-shell
// Removes comments to avoid parsing issues

CREATE INDEX IF NOT EXISTS FOR (e:Epub) ON (e.id);
CREATE INDEX IF NOT EXISTS FOR (c:Chapter) ON (c.id);
CREATE INDEX IF NOT EXISTS FOR (p:Paragraph) ON (p.id);
CREATE INDEX IF NOT EXISTS FOR (m:Media) ON (m.id);
CREATE INDEX IF NOT EXISTS FOR (meta:Metadata) ON (meta.key);

CREATE CONSTRAINT IF NOT EXISTS FOR (e:Epub) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chapter) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (m:Media) REQUIRE m.id IS UNIQUE;
