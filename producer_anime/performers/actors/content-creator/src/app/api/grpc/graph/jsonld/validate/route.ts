/**
 * Validate JSON-LD API Route
 * gRPC GraphServiceのvalidateJsonLdをプロキシ
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const GRPC_API_URL = process.env.GRPC_API_URL || 'host.docker.internal:50051';

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
    client = new GraphService(
      GRPC_API_URL,
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const { jsonld } = await request.json();
    
    if (!jsonld) {
      return NextResponse.json(
        { error: 'jsonld is required' },
        { status: 400 }
      );
    }

    const grpcClient = getClient();
    
    return new Promise<NextResponse>((resolve) => {
      grpcClient.validateJsonLd(
        { jsonld: typeof jsonld === 'string' ? jsonld : JSON.stringify(jsonld) },
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

