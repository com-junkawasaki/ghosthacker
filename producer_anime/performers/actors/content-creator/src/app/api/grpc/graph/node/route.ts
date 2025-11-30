/**
 * Create Graph Node API Route
 * gRPC GraphServiceのcreateGraphNodeをプロキシ
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, properties, jsonld, vector } = body;
    
    if (!label || !properties || !jsonld) {
      return NextResponse.json(
        { error: 'label, properties, and jsonld are required' },
        { status: 400 }
      );
    }

    const grpcClient = getClient();
    
    return new Promise<NextResponse>((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(
          NextResponse.json(
            { error: 'gRPC request timeout: The graph service did not respond in time' },
            { status: 504 }
          )
        );
      }, 30000); // 30秒タイムアウト

      grpcClient.createGraphNode(
        {
          label,
          properties: typeof properties === 'string' ? properties : JSON.stringify(properties),
          jsonld: typeof jsonld === 'string' ? jsonld : JSON.stringify(jsonld),
          vector: vector || [],
        },
        (error: any, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            console.error('gRPC createGraphNode error:', {
              code: error.code,
              message: error.message,
              details: error.details,
              grpcUrl: GRPC_API_URL,
            });
            const statusCode = error.code === grpc.status.UNAVAILABLE ? 503 : 500;
            resolve(
              NextResponse.json(
                { 
                  error: error.message || 'Failed to create graph node',
                  code: error.code,
                  details: error.details,
                },
                { status: statusCode }
              )
            );
          } else {
            resolve(NextResponse.json(response));
          }
        }
      );
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

