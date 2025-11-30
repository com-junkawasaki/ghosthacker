# gRPC Client Implementation

このディレクトリには、gRPCクライアントの実装が含まれています。

## アーキテクチャ

### Rust Backend
- **tonic**: gRPCサーバー実装
- **tonic-web**: gRPC-Web対応（ブラウザからの直接アクセスを可能にする）

### TypeScript Frontend
- **protobuf-ts**: TypeScript用のprotobuf実装
- **@protobuf-ts/grpcweb-transport**: gRPC-Webトランスポート
- **@protobuf-ts/plugin**: .protoファイルからTypeScriptコードを生成

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. TypeScriptコードの生成

```bash
pnpm codegen:grpc
```

このコマンドは、`../../services/grpc/proto` にある `.proto` ファイルから、`src/internal/grpc/generated` にTypeScriptコードを生成します。

### 3. 生成されるファイル

- `*.ts`: メッセージ型定義
- `*Client.ts`: gRPC-Webクライアント

## 使用方法

### クライアントの作成

```typescript
import { getGrpcWebTransport } from '@/internal/grpc/protobuf-ts-client';
import { GraphRagServiceClient } from '@/internal/grpc/generated/producer.graph.GraphRagService';
import { GraphRagQueryRequest } from '@/internal/grpc/generated/producer.graph';

const transport = getGrpcWebTransport();
const client = new GraphRagServiceClient(transport);

const request = GraphRagQueryRequest.create({
  query: "What is the story about?",
  projectId: "project-123",
});

const response = await client.query(request);
console.log(response.response);
```

### API Routeでの使用

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getGrpcWebTransport } from '@/internal/grpc/protobuf-ts-client';
import { GraphRagServiceClient } from '@/internal/grpc/generated/producer.graph.GraphRagService';
import { GraphRagQueryRequest } from '@/internal/grpc/generated/producer.graph';

export async function POST(request: NextRequest) {
  const { query, project_id } = await request.json();
  
  const transport = getGrpcWebTransport();
  const client = new GraphRagServiceClient(transport);
  
  const grpcRequest = GraphRagQueryRequest.create({
    query,
    projectId: project_id,
  });
  
  try {
    const response = await client.query(grpcRequest);
    return NextResponse.json({ response: response.response });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## 環境変数

- `GRPC_WEB_URL`: gRPC-Webエンドポイント（デフォルト: `http://localhost:50051`）
- `NEXT_PUBLIC_GRPC_WEB_URL`: ブラウザ側で使用するgRPC-Webエンドポイント

## 移行ガイド

### 既存の `@grpc/grpc-js` からの移行

1. **依存関係の更新**: `package.json` に `@protobuf-ts/*` を追加済み
2. **コード生成**: `pnpm codegen:grpc` を実行
3. **API Routesの更新**: 
   - `@grpc/grpc-js` の代わりに `protobuf-ts` クライアントを使用
   - 生成された型定義を使用して型安全な実装に変更
4. **Rust側の設定**: `tonic-web` を追加済み（Cargo.toml）

## トラブルシューティング

### コード生成が失敗する場合

1. `protoc` がインストールされているか確認:
   ```bash
   protoc --version
   ```

2. `@protobuf-ts/plugin` がインストールされているか確認:
   ```bash
   ls node_modules/.bin/protoc-gen-ts
   ```

3. protoファイルのパスが正しいか確認:
   - `../../services/grpc/proto` に `.proto` ファイルが存在するか

### gRPC-Web接続が失敗する場合

1. Rustサーバーが `tonic-web` で起動しているか確認
2. CORS設定が正しいか確認（`main.rs` のCORS設定）
3. `GRPC_WEB_URL` 環境変数が正しく設定されているか確認

## 参考資料

- [protobuf-ts Documentation](https://github.com/timostamm/protobuf-ts)
- [tonic-web Documentation](https://github.com/hyperium/tonic/tree/master/tonic-web)
- [gRPC-Web Specification](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)

