# Docker Compose Setup

## サービス構成

- **postgres**: PostgreSQL 16 (ポート: 5433)
- **graphql**: Rust GraphQL サービス (ポート: 8080)
- **neo4j**: Neo4j 5.23 (ポート: 7475, 7688)

## 起動方法

### 1. データベースサービスのみ起動

```bash
docker-compose up -d postgres neo4j
```

### 2. GraphQL サービスの起動（ローカル開発推奨）

GraphQL サービスは開発環境ではローカルで実行することを推奨します：

```bash
cd producer/performers/services/graphql
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"
cargo run
```

または、Docker で起動する場合：

```bash
docker-compose up -d graphql
```

## 環境変数

`.envrc` または環境変数で以下を設定：

```bash
# Database
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"

# GraphQL API
export NEXT_PUBLIC_GRAPHQL_API_URL="http://localhost:8080/graphql"

# Next.js App
export NEXT_PUBLIC_APP_URL="http://localhost:1016"
```

## 接続情報

- **PostgreSQL**: `postgresql://postgres:postgres@localhost:5433/postgres`
- **Neo4j Browser**: http://localhost:7475
- **Neo4j Bolt**: `bolt://localhost:7688`
- **GraphQL Playground**: http://localhost:8080/graphql

## 注意事項

- PostgreSQL のポートは 5433 に変更されています（既存の Supabase ローカルインスタンスとの競合を避けるため）
- GraphQL サービスは開発環境ではローカル実行を推奨（ホットリロード対応のため）
- データベースマイグレーションは GraphQL サービス起動前に実行が必要

