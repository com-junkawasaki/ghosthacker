/**
 * Graph RAG Query API Route
 * gRPC GraphRagServiceのqueryをプロキシ
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
const GraphRagService = graphProto.producer.graph.GraphRagService;

let client: any = null;

function getClient() {
  if (!client) {
    client = new GraphRagService(
      GRPC_API_URL,
      grpc.credentials.createInsecure()
    );
  }
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const { query, project_id } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const grpcClient = getClient();
    
    return new Promise((resolve) => {
      // タイムアウト処理を追加（60秒 - RAG処理は時間がかかる可能性がある）
      const timeoutId = setTimeout(() => {
        resolve(
          NextResponse.json(
            { error: 'gRPC request timeout: The graph RAG service did not respond in time' },
            { status: 504 }
          )
        );
      }, 60000);
      
      // proto定義では rpc Query なので、query メソッドを使用
      grpcClient.query(
        { query, project_id },
        (error: any, response: any) => {
          clearTimeout(timeoutId);
          if (error) {
            resolve(
              NextResponse.json(
                { error: error.message || 'Graph RAG query failed' },
                { status: 500 }
              )
            );
          } else {
            // gRPCレスポンスは { response: "..." } 形式（GraphRagQueryResponse）
            resolve(NextResponse.json({ 
              response: response.response || response 
            }));
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

