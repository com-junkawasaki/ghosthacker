# GraphQL Service

Rust + async-graphql で実装された GraphQL バックエンドサービス。

## 構造

- `src/schema/`: GraphQL Schema定義（Query, Mutation, Types）
- `src/activities/`: Activity実装（Story, Canvas, Pipeline）
- `src/infra/`: インフラストラクチャ（Database, Schema）
- `src/ports/`: ポート定義（Query, Mutation）

## 実行

```bash
cd performers/services/graphql
cargo run
```

GraphQL Playground: http://localhost:8080/graphql

## 環境変数

- `DATABASE_URL`: PostgreSQL接続URL

## Capabilities & Activities

このサービスは以下のCapabilityを実装しています：

- Story Management Capability
- Canvas Management Capability  
- Pipeline Execution Capability

詳細は `../../capabilities.jsonld` と `../../activities.jsonld` を参照してください。

