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
  console.log('[API] POST /api/grpc/graph/node: Request received');
  
  try {
    const body = await request.json();
    console.log('[API] POST /api/grpc/graph/node: Request body:', {
      label: body.label,
      hasProperties: !!body.properties,
      hasJsonld: !!body.jsonld,
      hasVector: !!body.vector,
    });
    
    const { label, properties, jsonld, vector } = body;
    
    if (!label || !properties || !jsonld) {
      console.error('[API] POST /api/grpc/graph/node: Missing required fields', {
        hasLabel: !!label,
        hasProperties: !!properties,
        hasJsonld: !!jsonld,
      });
      return NextResponse.json(
        { error: 'label, properties, and jsonld are required' },
        { status: 400 }
      );
    }

    console.log('[API] POST /api/grpc/graph/node: Getting gRPC client, URL:', GRPC_API_URL);
    const grpcClient = getClient();
    console.log('[API] POST /api/grpc/graph/node: gRPC client obtained');
    
    return new Promise<NextResponse>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.error('[API] POST /api/grpc/graph/node: Request timeout after 30s');
        resolve(
          NextResponse.json(
            { error: 'gRPC request timeout: The graph service did not respond in time' },
            { status: 504 }
          )
        );
      }, 30000); // 30秒タイムアウト

      const grpcRequest = {
        label,
        properties: typeof properties === 'string' ? properties : JSON.stringify(properties),
        jsonld: typeof jsonld === 'string' ? jsonld : JSON.stringify(jsonld),
        vector: vector || [],
      };

      console.log('[API] POST /api/grpc/graph/node: Calling gRPC createGraphNode with:', {
        label: grpcRequest.label,
        propertiesLength: grpcRequest.properties.length,
        jsonldLength: grpcRequest.jsonld.length,
        vectorLength: grpcRequest.vector.length,
      });

      grpcClient.createGraphNode(
        grpcRequest,
        (error: any, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            console.error('[API] POST /api/grpc/graph/node: gRPC error:', {
              code: error.code,
              message: error.message,
              details: error.details,
              grpcUrl: GRPC_API_URL,
              stack: error.stack,
            });
            const appError = classifyError(error);
            logError(appError, 'CreateGraphNode.createGraphNode');
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
            console.log('[API] POST /api/grpc/graph/node: Success response:', {
              id: response?.id,
              hasId: !!response?.id,
              responseKeys: response ? Object.keys(response) : [],
            });
            resolve(NextResponse.json(response));
          }
        }
      );
    });
  } catch (error: any) {
    console.error('[API] POST /api/grpc/graph/node: Exception caught:', {
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

