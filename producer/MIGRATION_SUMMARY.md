# GraphQL Migration Summary

## 完了した作業

### 1. バックエンド実装
- ✅ Rust + async-graphql で GraphQL サービスを実装
- ✅ DoDAF v2 DM2 に基づく capabilities.jsonld と activities.jsonld を作成
- ✅ GraphQL Schema の実装（Query, Mutation, Types）
- ✅ Activity 実装（Story, Canvas, Pipeline）
- ✅ Diesel によるデータベース統合

### 2. フロントエンド移行
- ✅ GraphQL クライアント（graphql-request）の設定
- ✅ Server Actions を GraphQL に移行（`src/app/(producer)/canvas/story/actions.ts`）
- ✅ PreviewPanel を GraphQL に移行
- ✅ ProducerCanvas を GraphQL に移行
- ✅ 各フォームコンポーネントから tRPC コードを削除

### 3. tRPC コードの削除
- ✅ `src/server/routers/` ディレクトリを削除
- ✅ `src/server/trpc.ts` を削除
- ✅ `src/app/api/trpc/` ディレクトリを削除
- ✅ 各コンポーネントから tRPC の import を削除

## 変更されたファイル

### 新規作成
- `capabilities.jsonld` - Capability 定義
- `activities.jsonld` - Activity 定義
- `src/lib/graphql-client.ts` - GraphQL クライアント設定
- `performers/services/graphql/` - Rust GraphQL サービス
- `codegen.yaml` - GraphQL Codegen 設定

### 更新
- `package.json` - graphql, graphql-request を追加、tRPC 依存関係を削除
- `src/app/(producer)/canvas/story/actions.ts` - GraphQL に移行
- `src/app/(producer)/canvas/story/PreviewPanel.client.tsx` - GraphQL に移行
- `src/app/(producer)/canvas/ProducerCanvas.client.tsx` - GraphQL に移行
- 各フォームコンポーネント - tRPC コードを削除

### 削除
- `src/server/routers/` - tRPC ルーター
- `src/server/trpc.ts` - tRPC 設定
- `src/app/api/trpc/` - tRPC API ルート

## 次のステップ

1. **GraphQL サーバーの起動**
   ```bash
   cd performers/services/graphql
   export DATABASE_URL="postgresql://..."
   cargo run
   ```

2. **環境変数の設定**
   - `NEXT_PUBLIC_GRAPHQL_API_URL` を設定（デフォルト: http://localhost:8080/graphql）

3. **GraphQL Codegen の実行**
   ```bash
   pnpm graphql-codegen
   ```

4. **Story Activities の完全実装**
   - 現在は stub 実装のため、完全な実装が必要

5. **テスト**
   - GraphQL クエリとミューテーションの動作確認
   - フロントエンドの動作確認

## 注意事項

- GraphQL サーバーは `http://localhost:8080/graphql` で起動します
- 環境変数 `NEXT_PUBLIC_GRAPHQL_API_URL` でエンドポイントを変更可能
- 一部の Activity は stub 実装のため、完全な実装が必要です

