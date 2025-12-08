/**
 * protobuf-ts gRPC-Web Client
 * protobuf-ts + grpc-webを使用したgRPCクライアント
 * 
 * @context {
 *   "@id": "ex:ProtobufTsGrpcClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GrpcWebClient"
 * }
 */

import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';

// gRPC-Webエンドポイント（tonic-web経由）
const GRPC_WEB_URL = process.env.NEXT_PUBLIC_GRPC_WEB_URL || 
                     process.env.GRPC_WEB_URL || 
                     'http://localhost:50051';

/**
 * gRPC-Webトランスポートを作成
 * tonic-webサーバーに接続するためのトランスポート
 */
export function createGrpcWebTransport(): GrpcWebFetchTransport {
  return new GrpcWebFetchTransport({
    baseUrl: GRPC_WEB_URL,
    // CORS設定（必要に応じて）
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, {
        ...init,
        // gRPC-Web用のヘッダー
        headers: {
          ...init?.headers,
          'Content-Type': 'application/grpc-web+proto',
        },
      });
    },
  });
}

// シングルトンインスタンス
let transport: GrpcWebFetchTransport | null = null;

/**
 * gRPC-Webトランスポートを取得（シングルトン）
 */
export function getGrpcWebTransport(): GrpcWebFetchTransport {
  if (!transport) {
    transport = createGrpcWebTransport();
  }
  return transport;
}


