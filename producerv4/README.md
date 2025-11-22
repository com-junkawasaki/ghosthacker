# Producer v4: AI Agentを使ったマンガ制作ウェブアプリ

## プロジェクト概要

producerv3のアーキテクチャを基盤に、マンガ制作に特化した新バージョン。単一Canvas（Konva.js）でページ全体を管理し、fal.ai/DeepInfraによるモデル選択機能を実装。

## アーキテクチャ概要

- **Frontend**: Next.js 14 App Router + React 18 + react-konva + Tailwind CSS
- **Backend**: GraphQL (Poem 3/Rust) + PostgreSQL 16
- **AI Integration**: fal.ai / DeepInfra（モデル選択）、OpenAI DALL-E（オプション）
- **Canvas**: Konva.js（単一Canvas + レイヤー管理）
- **Data Model**: OWL/SHACL + RDF (JSON-LD) でマンガ構造を定義

## セットアップ

### 前提条件

- Node.js 20以上
- Rust 1.70以上
- Docker & Docker Compose
- pnpm

### インストール

```bash
# 依存関係のインストール
pnpm install

# Docker Composeでサービス起動
docker-compose up -d

# GraphQL Codegen実行
pnpm codegen
```

### 開発サーバー起動

```bash
# フロントエンド開発サーバー
pnpm dev

# GraphQL API: http://localhost:25326/graphql
# Frontend: http://localhost:25321
```

## プロジェクト構造

```
producerv4/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # Reactコンポーネント
│   ├── lib/                    # ユーティリティ
│   └── types/                  # TypeScript型定義
└── performers/
    └── services/
        └── graphql/            # Rust GraphQLサービス
```

## データベーススキーマ

PostgreSQL 16を使用。マイグレーションファイルは `performers/services/graphql/migrations/` に配置。

## ライセンス

MIT

