/**
 * Graph Query API Route (protobuf-ts version)
 * protobuf-ts + @grpc/grpc-jsを使用した実装
 * 
 * 生成されたコードを使用して型安全なgRPCクライアントを実装
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { GraphServiceClient } from '@/internal/grpc/generated/graph.grpc-client';
import { GraphQueryRequest, GraphQueryResponse } from '@/internal/grpc/generated/graph';

const GRPC_API_URL = process.env.GRPC_API_URL || 'host.docker.internal:50051';

let client: GraphServiceClient | null = null;

function getClient(): GraphServiceClient {
  if (!client) {
    client = new GraphServiceClient(
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
    
    // 生成された型を使用してリクエストを作成
    const grpcRequest = GraphQueryRequest.create({
      query,
    });
    
    return new Promise((resolve) => {
      // タイムアウト処理を追加（25秒）
      const timeoutId = setTimeout(() => {
        resolve(
          NextResponse.json(
            { error: 'gRPC request timeout: The graph service did not respond in time' },
            { status: 504 }
          )
        );
      }, 25000);
      
      // 生成されたクライアントを使用してgRPC呼び出し
      grpcClient.graphQuery(grpcRequest, (error: grpc.ServiceError | null, response?: GraphQueryResponse) => {
        clearTimeout(timeoutId);
        if (error) {
          resolve(
            NextResponse.json(
              { error: error.message || 'gRPC request failed' },
              { status: 500 }
            )
          );
        } else if (response) {
          // gRPCレスポンスは { result: "..." } 形式（GraphQueryResponse）
          resolve(NextResponse.json({ 
            result: response.result || '',
            resultJson: response.result || '' // 後方互換性のため
          }));
        } else {
          resolve(
            NextResponse.json(
              { error: 'No response from server' },
              { status: 500 }
            )
          );
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

