/**
 * Semantic Search API Route
 * gRPC GraphServiceのsemanticSearchをプロキシ
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const GRPC_API_URL = process.env.GRPC_API_URL || 'grpc:50051';

const PROTO_PATH = path.join(process.cwd(), '../../../../../../services/grpc/proto');

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
    client = new GraphService(
      GRPC_API_URL,
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const grpcClient = getClient();
    
    return new Promise((resolve) => {
      grpcClient.semanticSearch(
        { query, limit: limit || 10 },
        (error: any, response: any) => {
          if (error) {
            resolve(
              NextResponse.json(
                { error: error.message },
                { status: 500 }
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

