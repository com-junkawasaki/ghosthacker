/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/grpc-manga-editor-client
 * 
 * gRPC client for Manga Editor Service
 * Re-exports generated types and client for convenience
 */

// Re-export generated types and client
export * from './generated/types';
export { mangaEditorServiceClient } from './generated/client';

// Export the client instance for convenience
import { mangaEditorServiceClient } from './generated/client';
export const mangaEditorGrpcClient = mangaEditorServiceClient;

