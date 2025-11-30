/**
 * Export JSON-LD API Route
 * gRPC GraphServiceのexportJsonLdをプロキシ
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

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
    client = new GraphService(
      GRPC_API_URL,
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id') || undefined;

    const grpcClient = getClient();
    
    return new Promise<NextResponse>((resolve) => {
      grpcClient.exportJsonLd(
        { project_id: projectId },
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

