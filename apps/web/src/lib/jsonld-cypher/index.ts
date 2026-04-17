/**
 * jsonld-cypher — Cypher-like query engine for JSON-LD documents.
 *
 * Loads a JSON-LD document into an in-memory property graph and
 * exposes a Cypher-subset query interface for traversal.
 *
 * Usage:
 *   const g = GraphStore.fromJsonLd(jsonld);
 *   const panels = g.query('MATCH (p:Page)-[:HAS_PANEL]->(panel:Panel) RETURN panel');
 *   const dialogue = g.query('MATCH (panel:Panel)-[:HAS_DIALOGUE]->(d:Dialogue) WHERE panel.pageNumber = 3 RETURN d');
 */

export { GraphStore } from './graph-store';
export { query, type CypherResult } from './cypher';
export { loadEpisodeGraph } from './loaders';
export type { GraphNode, GraphEdge } from './graph-store';
