/**
 * Library Root
 * gRPCサービス用に公開するモジュール
 */

pub mod services;

// 既存のgraphqlサービスのモジュールを再利用
pub use producerv2_grpc_web::database;
pub use producerv2_grpc_web::graph;
pub use producerv2_grpc_web::validation;

