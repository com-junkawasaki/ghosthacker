/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/grpc-error-handling
 * 
 * Error handling utilities for gRPC service
 */
use tonic::Status;
use sqlx::Error as SqlxError;

/// Convert SQLx errors to gRPC Status
pub fn sqlx_error_to_status(err: SqlxError) -> Status {
    match err {
        SqlxError::RowNotFound => Status::not_found("Resource not found"),
        SqlxError::Database(db_err) => {
            // Check for common database errors
            if db_err.message().contains("duplicate key") {
                Status::already_exists("Resource already exists")
            } else if db_err.message().contains("foreign key") {
                Status::failed_precondition("Foreign key constraint violation")
            } else {
                Status::internal(format!("Database error: {}", db_err.message()))
            }
        }
        SqlxError::PoolClosed => Status::unavailable("Database connection pool closed"),
        SqlxError::PoolTimedOut => Status::deadline_exceeded("Database connection timeout"),
        _ => Status::internal(format!("Database error: {}", err)),
    }
}

/// Convert UUID parsing errors to gRPC Status
pub fn uuid_error_to_status(err: uuid::Error) -> Status {
    Status::invalid_argument(format!("Invalid UUID: {}", err))
}

/// Convert JSON parsing errors to gRPC Status
pub fn json_error_to_status(err: serde_json::Error) -> Status {
    Status::invalid_argument(format!("Invalid JSON: {}", err))
}

/// Convert anyhow errors to gRPC Status
pub fn anyhow_error_to_status(err: anyhow::Error) -> Status {
    Status::internal(format!("Internal error: {}", err))
}
