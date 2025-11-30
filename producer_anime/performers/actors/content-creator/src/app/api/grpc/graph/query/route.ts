/**
 * Graph Query API Route
 * gRPC GraphServiceのgraphQueryをプロキシ
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

// Dockerコンテナ内からホストのgRPCサービスに接続する場合は host.docker.internal:50051
// ローカル開発環境では localhost:50051
const GRPC_API_URL = process.env.GRPC_API_URL || 'host.docker.internal:50051';

// protoファイルのパス
// process.cwd()はNext.jsアプリのルート（/app/performers/actors/content-creator）を返す
// Dockerコンテナ内では /app/performers/services/grpc/proto が正しいパス
const PROTO_PATH = path.join(process.cwd(), '../../services/grpc/proto');

// protoファイルのロードオプション
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
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const grpcClient = getClient();
    
    return new Promise((resolve) => {
      grpcClient.graphQuery({ query }, (error: any, response: any) => {
        if (error) {
          resolve(
            NextResponse.json(
              { error: error.message },
              { status: 500 }
            )
          );
        } else {
          // gRPCレスポンスは { result: "..." } 形式（GraphQueryResponse）
          resolve(NextResponse.json({ 
            result: response.result || '',
            resultJson: response.result || '' // 後方互換性のため
          }));
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

