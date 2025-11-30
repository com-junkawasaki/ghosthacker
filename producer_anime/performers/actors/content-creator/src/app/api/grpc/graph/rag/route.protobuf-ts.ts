/**
 * Graph RAG Query API Route (protobuf-ts version)
 * protobuf-ts + @grpc/grpc-jsを使用した実装
 * 
 * 生成されたコードを使用して型安全なgRPCクライアントを実装
 */

import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { GraphRagServiceClient } from '@/internal/grpc/generated/graph.grpc-client';
import { GraphRagQueryRequest, GraphRagQueryResponse } from '@/internal/grpc/generated/graph';

const GRPC_API_URL = process.env.GRPC_API_URL || 'host.docker.internal:50051';

let client: GraphRagServiceClient | null = null;

function getClient(): GraphRagServiceClient {
  if (!client) {
    client = new GraphRagServiceClient(
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
    
    // 生成された型を使用してリクエストを作成
    const grpcRequest = GraphRagQueryRequest.create({
      query,
      projectId: project_id || undefined,
    });
    
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
      
      // 生成されたクライアントを使用してgRPC呼び出し
      grpcClient.query(grpcRequest, (error: grpc.ServiceError | null, response?: GraphRagQueryResponse) => {
        clearTimeout(timeoutId);
        if (error) {
          resolve(
            NextResponse.json(
              { error: error.message || 'Graph RAG query failed' },
              { status: 500 }
            )
          );
        } else if (response) {
          // gRPCレスポンスは { response: "..." } 形式（GraphRagQueryResponse）
          resolve(NextResponse.json({ 
            response: response.response || '' 
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

