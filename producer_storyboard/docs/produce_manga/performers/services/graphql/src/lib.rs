/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/graphql
 * 
 * GraphQL API service for Manga Editor Tool
 * Provides Query and Mutation operations for manga editing
 * Uses PostgreSQL database with sqlx for data persistence
 */
pub mod ports;
pub mod resolvers;
pub mod schema;

pub use ports::postgres;

