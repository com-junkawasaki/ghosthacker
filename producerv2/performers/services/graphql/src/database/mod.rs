/**
 * Database Module
 * SQLx + PostgreSQL を使用した RDF/SHACL/JSON-LD データベース実装
 * 
 * @context {
 *   "@id": "ex:DatabaseModule",
 *   "@type": "ex:Module",
 *   "ex:provides": "ex:DatabaseIntegration"
 * }
 */

pub mod client;
pub mod schema;

pub use client::{delete_document, get_all_resources};

