/**
 * List Graph Edges API Route
 * gRPC GraphServiceのlistGraphEdgesをプロキシ
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { classifyError, logError } from '@/utils/errorHandling';

const GRPC_API_URL = process.env.GRPC_API_URL || 'grpc:50051';

const PROTO_PATH = path.join(process.cwd(), '../../services/grpc/proto');

const packageDefinition = protoLoader.loadSync(
  [
    path.join(PROTO_PATH, 'common.proto'),
    path.join(PROTO_PATH, 'graph.proto'),
  ],
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const graphProto = grpc.loadPackageDefinition(packageDefinition) as any;
const GraphService = graphProto.producer.graph.GraphService;

let client: any = null;

function getClient() {
  if (!client) {
    try {
      client = new GraphService(
        GRPC_API_URL,
        grpc.credentials.createInsecure()
      );
    } catch (error) {
      console.error('Failed to create gRPC client:', error);
      throw new Error(`Failed to connect to gRPC service at ${GRPC_API_URL}`);
    }
  }
  return client;
}

export async function GET(request: NextRequest) {
  console.log('[API] GET /api/grpc/graph/edges: Request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const grpcClient = getClient();
    
    return new Promise<NextResponse>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.error('[API] GET /api/grpc/graph/edges: Request timeout after 30s');
        resolve(
          NextResponse.json(
            { error: 'gRPC request timeout: The graph service did not respond in time' },
            { status: 504 }
          )
        );
      }, 30000);

      const grpcRequest = {
        limit,
        offset,
      };

      console.log('[API] GET /api/grpc/graph/edges: Calling gRPC listGraphEdges with:', grpcRequest);

      grpcClient.listGraphEdges(
        grpcRequest,
        (error: any, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            console.error('[API] GET /api/grpc/graph/edges: gRPC error:', {
              code: error.code,
              message: error.message,
              details: error.details,
              grpcUrl: GRPC_API_URL,
              stack: error.stack,
            });
            const appError = classifyError(error);
            logError(appError, 'ListGraphEdges.listGraphEdges');
            const statusCode = error.code === grpc.status.UNAVAILABLE ? 503 : 500;
            resolve(
              NextResponse.json(
                { 
                  error: error.message || 'Failed to list graph edges',
                  code: error.code,
                  details: error.details,
                },
                { status: statusCode }
              )
            );
          } else {
            console.log('[API] GET /api/grpc/graph/edges: Success response:', {
              edgesCount: response?.edges?.length || 0,
              hasEdges: !!response?.edges,
            });
            resolve(NextResponse.json(response));
          }
        }
      );
    });
  } catch (error: any) {
    console.error('[API] GET /api/grpc/graph/edges: Exception caught:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

