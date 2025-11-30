/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/grpc
 * 
 * gRPC API service for Manga Editor Tool
 * Provides gRPC operations for manga editing
 * Uses PostgreSQL database with sqlx for data persistence
 */
pub mod ports;
pub mod service;

pub use ports::postgres;

