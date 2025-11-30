/**
 * List Graph Nodes API Route
 * gRPC GraphServiceのlistGraphNodesをプロキシ
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
  console.log('[API] GET /api/grpc/graph/nodes: Request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const grpcClient = getClient();
    
    return new Promise<NextResponse>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.error('[API] GET /api/grpc/graph/nodes: Request timeout after 30s');
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

      console.log('[API] GET /api/grpc/graph/nodes: Calling gRPC listGraphNodes with:', grpcRequest);

      grpcClient.listGraphNodes(
        grpcRequest,
        (error: any, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            console.error('[API] GET /api/grpc/graph/nodes: gRPC error:', {
              code: error.code,
              message: error.message,
              details: error.details,
              grpcUrl: GRPC_API_URL,
              stack: error.stack,
            });
            const appError = classifyError(error);
            logError(appError, 'ListGraphNodes.listGraphNodes');
            const statusCode = error.code === grpc.status.UNAVAILABLE ? 503 : 500;
            resolve(
              NextResponse.json(
                { 
                  error: error.message || 'Failed to list graph nodes',
                  code: error.code,
                  details: error.details,
                },
                { status: statusCode }
              )
            );
          } else {
            console.log('[API] GET /api/grpc/graph/nodes: Success response:', {
              nodesCount: response?.nodes?.length || 0,
              hasNodes: !!response?.nodes,
            });
            resolve(NextResponse.json(response));
          }
        }
      );
    });
  } catch (error: any) {
    console.error('[API] GET /api/grpc/graph/nodes: Exception caught:', {
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

