/**
 * gRPC Client
 * gRPCサービスへの接続とクライアント初期化
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const GRPC_API_URL =
  process.env.NEXT_PUBLIC_GRPC_API_URL ||
  process.env.GRPC_API_URL ||
  'localhost:50051';

// protoファイルのパス
const PROTO_PATH = process.env.NEXT_PUBLIC_PROTO_PATH || '/proto';

// protoファイルのロードオプション
const packageDefinition = protoLoader.loadSync(
  [
    `${PROTO_PATH}/common.proto`,
    `${PROTO_PATH}/producer.proto`,
    `${PROTO_PATH}/graph.proto`,
  ],
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

// gRPCクライアントの作成
export function createGrpcClient(): grpc.Client {
  // 注意: ブラウザから直接gRPCを呼び出す場合は、gRPC-Webプロキシが必要
  // サーバーサイド（Next.js API routes）から呼び出す場合は通常のgRPCクライアントを使用可能
  const credentials = grpc.credentials.createInsecure();
  return new grpc.Client(GRPC_API_URL, credentials);
}

// クライアントインスタンス（シングルトン）
let client: grpc.Client | null = null;

export function getGrpcClient(): grpc.Client {
  if (!client) {
    client = createGrpcClient();
  }
  return client;
}

