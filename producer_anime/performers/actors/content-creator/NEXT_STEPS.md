# Next Steps: protobuf-ts実装の完了

## 完了した作業

1. ✅ **依存関係の追加**
   - `@protobuf-ts/*`パッケージを追加
   - `tonic-web`、`tower`、`tower-http`をRust側に追加

2. ✅ **コード生成スクリプトの作成**
   - `scripts/generate-grpc-protobuf-ts.js`を作成
   - `.proto`ファイルからTypeScriptコードを自動生成

3. ✅ **RustサーバーのgRPC-Web対応**
   - `tonic-web`の`GrpcWebLayer`を追加
   - CORSレイヤーを追加

4. ✅ **TypeScriptコードの生成**
   - `pnpm codegen:grpc`でコード生成が成功
   - `src/internal/grpc/generated/`に以下が生成されました:
     - `graph.ts`: メッセージ型定義
     - `graph.grpc-client.ts`: gRPCクライアント
     - `producer.ts`: メッセージ型定義
     - `producer.grpc-client.ts`: gRPCクライアント
     - `common.ts`: 共通メッセージ型定義

5. ✅ **API Routeの実装例**
   - `src/app/api/grpc/graph/rag/route.protobuf-ts.ts`を作成
   - 生成されたコードを使用した実装例

## 次のステップ

### 1. 既存のAPI Routesを移行

現在の`route.ts`を`route.protobuf-ts.ts`の実装に置き換えます：

```bash
# バックアップ
mv src/app/api/grpc/graph/rag/route.ts src/app/api/grpc/graph/rag/route.old.ts

# 新しい実装を使用
mv src/app/api/grpc/graph/rag/route.protobuf-ts.ts src/app/api/grpc/graph/rag/route.ts
```

### 2. 他のAPI Routesも同様に更新

以下のAPI routesも同様に更新します：
- `src/app/api/grpc/graph/query/route.ts`
- `src/app/api/grpc/graph/node/[id]/route.ts`
- `src/app/api/grpc/graph/edge/[id]/route.ts`
- その他のgRPC API routes

### 3. Rustサーバーのビルドと起動

```bash
cd producer_anime/performers/services/grpc
cargo build
cargo run
```

### 4. 動作確認

1. Rustサーバーが起動していることを確認
2. Next.jsアプリケーションを起動
3. Graph RAG Chatコンポーネントでクエリを実行
4. エラーがないか確認

### 5. ブラウザ側でのgRPC-Web使用（オプション）

ブラウザから直接gRPC-Webを使用する場合は、`@protobuf-ts/grpcweb-transport`を使用します：

```typescript
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { GraphRagServiceClient } from '@/internal/grpc/generated/graph.grpc-client';
import { GraphRagQueryRequest } from '@/internal/grpc/generated/graph';

const transport = new GrpcWebFetchTransport({
  baseUrl: 'http://localhost:50051',
});

const client = new GraphRagServiceClient(transport);
const request = GraphRagQueryRequest.create({ query: "..." });
const response = await client.query(request);
```

## トラブルシューティング

### コード生成が失敗する場合

1. `protoc`がインストールされているか確認:
   ```bash
   protoc --version
   ```

2. `@protobuf-ts/plugin`がインストールされているか確認:
   ```bash
   ls node_modules/.pnpm/@protobuf-ts+plugin@2.11.1/node_modules/@protobuf-ts/plugin/bin/protoc-gen-ts
   ```

3. protoファイルのパスが正しいか確認

### gRPC接続が失敗する場合

1. Rustサーバーが起動しているか確認
2. `GRPC_API_URL`環境変数が正しく設定されているか確認
3. ネットワーク接続を確認（Docker環境の場合は`host.docker.internal`を使用）

## 参考資料

- [protobuf-ts Documentation](https://github.com/timostamm/protobuf-ts)
- [tonic-web Documentation](https://github.com/hyperium/tonic/tree/master/tonic-web)
- [gRPC-Web Specification](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md)

