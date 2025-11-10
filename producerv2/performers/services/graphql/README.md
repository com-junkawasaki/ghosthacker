# GraphQL Service

Rust async-graphqlサービス。TerminusDB OWLからGraphQLスキーマを生成し、クエリ・ミューテーション・サブスクリプションを提供。

## 実行

```bash
cd performers/services/graphql
cargo run
```

GraphQL Playground: http://localhost:8080/graphql

## 実装状況

- [x] 基本的なGraphQLスキーマ定義
- [ ] TerminusDB統合
- [ ] OWLからGraphQLスキーマ自動生成
- [ ] ミューテーション実装
- [ ] サブスクリプション実装

