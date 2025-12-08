# Sora Storyboard Video Generator

Soraのストーリーボード機能を参考に、シーン単位で動画を生成・結合する動画生成サービス。

## アーキテクチャ

- **Backend**: Rust (Tonic/gRPC) + PostgreSQL 16
- **Frontend**: SvelteKit 2.x + Connect-ES (gRPC-Web)
- **AI**: OpenAI API (動画生成)

## セットアップ

### 前提条件

- Docker & Docker Compose
- Rust (latest)
- Node.js 20+ & pnpm
- buf CLI (gRPCコード生成用)

### 環境変数

`.envrc`ファイルを作成:

```bash
export OPENAI_API_KEY=your_openai_api_key_here
export DATABASE_URL=postgresql://postgres:postgres@localhost:5435/postgres
export PUBLIC_GRPC_API_URL=http://localhost:25328
```

### 起動

```bash
# Docker Composeで全サービスを起動
docker-compose up

# 個別に起動する場合
# Backend
cd performers/services/grpc
cargo run

# Frontend
pnpm install
pnpm dev
```

## 開発

### gRPCコード生成

```bash
# TypeScript型を生成
pnpm grpc:generate
```

### データベースマイグレーション

マイグレーションは自動的に実行されます（Docker起動時）。

手動実行:

```bash
cd performers/services/grpc
sqlx migrate run
```

## プロジェクト構造

```
producer_storyboard/
├── PROJECT.jsonld          # プロジェクト定義
├── capabilities.jsonld      # Capability定義
├── activities.jsonld       # Activity定義
├── performers/
│   └── services/
│       └── grpc/           # Rust gRPCサービス
│           ├── proto/
│           │   └── storyboard.proto
│           ├── migrations/
│           │   └── 001_storyboard_schema.sql
│           └── src/
└── src/                    # SvelteKit frontend
    ├── app/
    ├── components/
    └── lib/
```

## API

### gRPC エンドポイント

- `http://localhost:25328` (gRPC-Web)

### 主要な操作

- プロジェクト作成・一覧取得
- ストーリーボード作成・編集
- シーン追加・編集・削除
- 動画生成（OpenAI API）
- 動画ステータス確認

## ライセンス

Private
