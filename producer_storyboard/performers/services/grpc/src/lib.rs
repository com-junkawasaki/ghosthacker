/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Service
 * @id https://gftd.ai/performer/service/grpc
 * 
 * gRPC API service for Storyboard Editor Tool
 * Provides gRPC operations for storyboard editing and video generation
 * Uses PostgreSQL database with sqlx for data persistence
 */
pub mod ports;
pub mod service;

pub use ports::postgres;
