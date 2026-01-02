/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/grpc-error-types
 * 
 * gRPC error types and utilities for frontend
 */

export interface GrpcError extends Error {
  code?: number;
  statusMessage?: string;
}

/**
 * Check if an error is a gRPC error
 */
export function isGrpcError(error: unknown): error is GrpcError {
  return (
    error instanceof Error &&
    typeof (error as GrpcError).code === 'number' &&
    typeof (error as GrpcError).statusMessage === 'string'
  );
}

/**
 * Get user-friendly error message from gRPC error
 */
export function getGrpcErrorMessage(error: unknown): string {
  if (isGrpcError(error)) {
    return error.statusMessage || error.message || 'Unknown gRPC error';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Check if error is a network error (service unavailable, timeout, etc.)
 */
export function isNetworkError(error: unknown): boolean {
  if (isGrpcError(error)) {
    // gRPC codes for network errors
    return error.code === 14 || // UNAVAILABLE
           error.code === 4 ||  // DEADLINE_EXCEEDED
           error.code === 13;    // INTERNAL (sometimes network related)
  }
  
  if (error instanceof Error) {
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.message.includes('fetch');
  }
  
  return false;
}

/**
 * Check if error is a client error (bad request, not found, etc.)
 */
export function isClientError(error: unknown): boolean {
  if (isGrpcError(error)) {
    // gRPC codes for client errors
    return error.code === 3 ||  // INVALID_ARGUMENT
           error.code === 5 ||   // NOT_FOUND
           error.code === 6 ||   // ALREADY_EXISTS
           error.code === 7 ||   // PERMISSION_DENIED
           error.code === 9 ||   // FAILED_PRECONDITION
           error.code === 11;    // OUT_OF_RANGE
  }
  
  return false;
}

/**
 * Check if error is a server error
 */
export function isServerError(error: unknown): boolean {
  if (isGrpcError(error)) {
    // gRPC codes for server errors
    return error.code === 13 || // INTERNAL
           error.code === 14 ||  // UNAVAILABLE
           error.code === 8 ||   // RESOURCE_EXHAUSTED
           error.code === 12;    // UNIMPLEMENTED
  }
  
  return false;
}

