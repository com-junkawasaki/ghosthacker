/**
 * Database Module
 * SQLx + PostgreSQL を使用したリレーショナルデータベース実装
 * 
 * @context {
 *   "@id": "ex:DatabaseModule",
 *   "@type": "ex:Module",
 *   "ex:provides": "ex:DatabaseIntegration"
 * }
 */

pub mod client;
pub mod migration;
pub mod schema;

pub use client::*;
pub use schema::*;

