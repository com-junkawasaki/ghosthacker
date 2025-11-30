/**
 * Graph Module
 * PostgreSQL + pgvector統合とRDFグラフ操作
 * 
 * @context {
 *   "@id": "ex:GraphModule",
 *   "@type": "ex:Module",
 *   "ex:provides": "ex:GraphOperations"
 * }
 */

pub mod postgres;
pub mod jsonld;
pub mod embedding;
pub mod rag;

// 後方互換性のため、postgresモジュールからエクスポート
pub use postgres::{GraphNode, GraphEdge, VectorSearchResult};

