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
            reject(new Error(response.statusMessage || `gRPC error: ${response.status}`));
          }
        },
      });
    });
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

