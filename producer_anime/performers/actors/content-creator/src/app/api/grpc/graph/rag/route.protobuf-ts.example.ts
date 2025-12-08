/**
 * Graph RAG Query API Route (protobuf-ts version)
 * protobuf-ts + gRPC-Webを使用した実装例
 * 
 * このファイルは実装例です。実際の使用時は、生成されたコードをインポートしてください。
 * 
 * 使用方法:
 * 1. pnpm codegen:grpc を実行してTypeScriptコードを生成
 * 2. 生成されたコードをインポート
 * 3. この実装例を参考にAPI routeを更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGrpcWebTransport } from '@/internal/grpc/protobuf-ts-client';

// 生成されたコードからインポート（例）
// import { GraphRagServiceClient } from '@/internal/grpc/generated/producer.graph.GraphRagService';
// import { GraphRagQueryRequest, GraphRagQueryResponse } from '@/internal/grpc/generated/producer.graph';

export async function POST(request: NextRequest) {
  try {
    const { query, project_id } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // protobuf-tsクライアントを使用
    const transport = getGrpcWebTransport();
    
    // 生成されたクライアントを使用（例）
    // const client = new GraphRagServiceClient(transport);
    // const request = GraphRagQueryRequest.create({
    //   query,
    //   projectId: project_id,
    // });
    
    // タイムアウト付きで呼び出し
    // const response = await Promise.race([
    //   client.query(request),
    //   new Promise((_, reject) => 
    //     setTimeout(() => reject(new Error('Request timeout')), 60000)
    //   ),
    // ]) as GraphRagQueryResponse;

    // return NextResponse.json({ 
    //   response: response.response 
    // });

    // 実際の実装では、上記のコメントアウト部分を使用
    return NextResponse.json(
      { error: 'protobuf-ts implementation pending. Run pnpm codegen:grpc first.' },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


