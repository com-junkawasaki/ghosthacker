# gRPC実装の移行: protobuf-ts + tonic-web

## 概要

このプロジェクトでは、以下のスタックを使用してgRPCを実装しています：

### Rust Backend
- **tonic**: gRPCサーバー実装
- **tonic-web**: gRPC-Web対応（ブラウザからの直接アクセスを可能にする）

### TypeScript Frontend
- **protobuf-ts**: TypeScript用のprotobuf実装
- **@protobuf-ts/grpcweb-transport**: gRPC-Webトランスポート
- **@protobuf-ts/plugin**: .protoファイルからTypeScriptコードを自動生成

## 実装済みの変更

### 1. 依存関係の追加

#### package.json
- `@protobuf-ts/grpcweb-transport`: gRPC-Webトランスポート
- `@protobuf-ts/runtime`: protobufランタイム
- `@protobuf-ts/runtime-rpc`: gRPCランタイム
- `@protobuf-ts/plugin`: コード生成プラグイン（devDependencies）

#### Cargo.toml
- `tonic-web`: gRPC-Web対応
- `tower`: ミドルウェアスタック
- `tower-http`: HTTPミドルウェア（CORS対応）

### 2. コード生成スクリプト

`scripts/generate-grpc-protobuf-ts.js` を作成しました。
このスクリプトは、`.proto`ファイルからTypeScriptの型定義とgRPC-Webクライアントコードを自動生成します。

実行方法:
```bash
pnpm codegen:grpc
```

### 3. RustサーバーのgRPC-Web対応

`performers/services/grpc/src/main.rs` を更新して、`tonic-web`とCORSレイヤーを追加しました。

変更点:
- `GrpcWebLayer`を追加してgRPC-Webリクエストを処理
- CORSレイヤーを追加してブラウザからのアクセスを許可

### 4. TypeScriptクライアントラッパー

`src/internal/grpc/protobuf-ts-client.ts` を作成しました。
このファイルは、gRPC-Webトランスポートのシングルトンインスタンスを提供します。

## 次のステップ

### 1. コード生成の実行

```bash
cd producer_anime/performers/actors/content-creator
pnpm install
pnpm codegen:grpc
```

### 2. API Routesの移行

現在のAPI routes（`@grpc/grpc-js`を使用）を、生成されたprotobuf-tsクライアントを使用するように更新します。

例: `src/app/api/grpc/graph/rag/route.ts`

```typescript
// 旧実装（@grpc/grpc-js）
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// 新実装（protobuf-ts）
import { getGrpcWebTransport } from '@/internal/grpc/protobuf-ts-client';
import { GraphRagServiceClient } from '@/internal/grpc/generated/producer.graph.GraphRagService';
import { GraphRagQueryRequest } from '@/internal/grpc/generated/producer.graph';
```

### 3. クライアント側の実装

ブラウザ側でも、生成されたprotobuf-tsクライアントを使用できます。

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
```

## 環境変数

- `GRPC_WEB_URL`: gRPC-Webエンドポイント（デフォルト: `http://localhost:50051`）
- `NEXT_PUBLIC_GRPC_WEB_URL`: ブラウザ側で使用するgRPC-Webエンドポイント

## 利点

1. **型安全性**: 生成されたTypeScriptコードにより、コンパイル時に型チェックが可能
2. **ブラウザ対応**: gRPC-Webにより、ブラウザから直接gRPCサービスを呼び出し可能
3. **モダンなスタック**: protobuf-tsは、TypeScript/gRPC-Web界のデファクトスタンダード
4. **自動生成**: .protoファイルから自動的にクライアントコードを生成

## トラブルシューティング

### コード生成が失敗する場合

1. `protoc`がインストールされているか確認:
   ```bash
   protoc --version
   ```

2. `@protobuf-ts/plugin`がインストールされているか確認:
   ```bash
   ls node_modules/.bin/protoc-gen-ts
   ```

3. protoファイルのパスが正しいか確認

### gRPC-Web接続が失敗する場合

1. Rustサーバーが`tonic-web`で起動しているか確認
2. CORS設定が正しいか確認
3. `GRPC_WEB_URL`環境変数が正しく設定されているか確認

## 参考資料

- [protobuf-ts Documentation](https://github.com/timostamm/protobuf-ts)
- [tonic-web Documentation](https://github.com/hyperium/tonic/tree/master/tonic-web)
- [gRPC-Web Specification](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)


