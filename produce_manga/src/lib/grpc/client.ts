/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/grpc-client
 * 
 * gRPC-Web client setup for Manga Editor
 * Uses @improbable-eng/grpc-web for browser compatibility
 */
import { grpc } from '@improbable-eng/grpc-web';

const GRPC_API_URL = process.env.NEXT_PUBLIC_GRPC_API_URL || 'http://localhost:25327';

export interface GrpcClientConfig {
  baseUrl?: string;
  metadata?: Record<string, string>;
}

export class GrpcClient {
  private baseUrl: string;
  private defaultMetadata: Record<string, string>;

  constructor(config: GrpcClientConfig = {}) {
    this.baseUrl = config.baseUrl || GRPC_API_URL;
    this.defaultMetadata = config.metadata || {};
  }

  /**
   * Create metadata object from record
   */
  private createMetadata(metadata?: Record<string, string>): grpc.Metadata {
    const md = new grpc.Metadata();
    // Add default metadata
    Object.entries(this.defaultMetadata).forEach(([key, value]) => {
      md.append(key, value);
    });
    // Add provided metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        md.append(key, value);
      });
    }
    return md;
  }

  /**
   * Create a unary RPC call
   */
  async unaryCall<Req, Res>(
    method: grpc.MethodDefinition<Req, Res>,
    request: Req,
    metadata?: Record<string, string>
  ): Promise<Res> {
    return new Promise((resolve, reject) => {
      grpc.unary(method, {
        request,
        host: this.baseUrl,
        metadata: this.createMetadata(metadata),
        onEnd: (response) => {
          if (response.status === grpc.Code.OK && response.message) {
            resolve(response.message);
          } else {
            // Convert gRPC status code to more descriptive error messages
            const errorMessage = this.getErrorMessage(response.status, response.statusMessage);
            const error = new Error(errorMessage);
            (error as any).code = response.status;
            (error as any).statusMessage = response.statusMessage;
            reject(error);
          }
        },
      });
    });
  }

  /**
   * Convert gRPC status code to user-friendly error message
   */
  private getErrorMessage(status: grpc.Code, statusMessage?: string): string {
    if (statusMessage) {
      return statusMessage;
    }

    switch (status) {
      case grpc.Code.NotFound:
        return 'Resource not found';
      case grpc.Code.InvalidArgument:
        return 'Invalid request parameters';
      case grpc.Code.AlreadyExists:
        return 'Resource already exists';
      case grpc.Code.PermissionDenied:
        return 'Permission denied';
      case grpc.Code.Unauthenticated:
        return 'Authentication required';
      case grpc.Code.ResourceExhausted:
        return 'Resource limit exceeded';
      case grpc.Code.FailedPrecondition:
        return 'Operation cannot be performed in current state';
      case grpc.Code.Aborted:
        return 'Operation was aborted';
      case grpc.Code.OutOfRange:
        return 'Value out of range';
      case grpc.Code.Unimplemented:
        return 'Operation not implemented';
      case grpc.Code.Internal:
        return 'Internal server error';
      case grpc.Code.Unavailable:
        return 'Service unavailable';
      case grpc.Code.DataLoss:
        return 'Data loss occurred';
      case grpc.Code.DeadlineExceeded:
        return 'Request timeout';
      default:
        return `gRPC error: ${status}`;
    }
  }

  /**
   * Create a server streaming RPC call
   */
  serverStreamingCall<Req, Res>(
    method: grpc.MethodDefinition<Req, Res>,
    request: Req,
    metadata?: Record<string, string>,
    onMessage?: (message: Res) => void,
    onError?: (error: Error) => void,
    onEnd?: () => void
  ): grpc.Client<Req, Res> {
    const client = grpc.client(method, {
      host: this.baseUrl,
      metadata: this.createMetadata(metadata),
    });

    if (onMessage) {
      client.onMessage(onMessage);
    }

    client.onEnd((status, statusMessage) => {
      if (status === grpc.Code.OK) {
        if (onEnd) {
          onEnd();
        }
      } else {
        const error = new Error(statusMessage || `gRPC error: ${status}`);
        if (onError) {
          onError(error);
        }
      }
    });

    client.start();
    client.send(request);

    return client;
  }
}

// Export singleton instance
export const grpcClient = new GrpcClient();

