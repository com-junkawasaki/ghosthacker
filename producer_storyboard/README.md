# Sora Storyboard Video Generator

Soraのストーリーボード機能を参考に、シーン単位で動画を生成・結合する動画生成サービス。

## アーキテクチャ

- **Backend**: Go (gRPC-Connect) + PostgreSQL 16 + Temporal
- **Frontend**: SvelteKit 2.x + gRPC API
- **AI**: OpenAI, Hume AI, Suno, Runway, Higgsfield
- **Orchestration**: Temporal (via Scaffold Kubernetes Operator)
- **Deployment**: Kubernetes (Skaffold/Helm) or Docker Compose

## セットアップ

### 前提条件

- Docker & Docker Compose
- Rust (latest)
- Node.js 20+ & pnpm

### クイックスタート

```bash
# 1. セットアップスクリプトを実行
./scripts/setup.sh

# 2. 環境変数を設定
cp .envrc.example .envrc
# .envrcを編集してOPENAI_API_KEYを設定

# 3. Docker Composeで全サービスを起動
make docker-up
# または
docker-compose up

# 4. 別ターミナルでフロントエンドを起動（開発モード）
pnpm dev
```

### 環境変数

#### ローカル開発環境

`.envrc`ファイルを作成:

```bash
export OPENAI_API_KEY=your_openai_api_key_here
export HUME_API_KEY=your_hume_api_key_here
export DATABASE_URL=postgresql://postgres:postgres@localhost:5435/postgres
# gRPC API URL is configured in docker-compose.yaml
```

#### Vercel環境変数の設定

Vercelにデプロイする場合、環境変数をVercelダッシュボードで設定するか、`vercel env pull`コマンドを使用します。

##### Vercelダッシュボードでの設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings > Environment Variables に移動
4. 以下の環境変数を追加:
   - `HUME_API_KEY`: Hume AI APIキー
   - `HUME_API_SECRET`: Hume AI APIシークレット（必要に応じて）
   - `OPENAI_API_KEY`: OpenAI APIキー
   - `DATABASE_URL`: PostgreSQL接続文字列
   - `CLERK_PUBLISHABLE_KEY`: Clerk公開キー
   - `CLERK_SECRET_KEY`: Clerkシークレットキー

##### vercel env pullコマンドの使用

既にVercelに環境変数が設定されている場合、ローカル環境に同期できます:

```bash
# Vercel CLIをインストール（未インストールの場合）
npm i -g vercel

# Vercelにログイン
vercel login

# 環境変数をローカルにプル（.env.localに保存）
vercel env pull .env.local

# 開発環境用（development）
vercel env pull .env.local --environment=development

# 本番環境用（production）
vercel env pull .env.local --environment=production
```

**注意**: `.vercelignore`ファイルで`.env`、`.envrc`、`.env.local`などの環境変数ファイルがVercelに含まれないよう設定されています。

### 手動セットアップ

```bash
# 依存関係のインストール
pnpm install

# Docker Composeで全サービスを起動
docker-compose up

# 個別に起動する場合
# Backend (gRPC-Go service)
cd performers/services/grpc-go
go run cmd/server/main.go

# Frontend
pnpm dev
```

## 開発

### gRPC API

```bash
# gRPC-GoサービスはDocker Composeで自動起動
# または手動で起動:
cd performers/services/grpc-go
go run cmd/server/main.go

# APIエンドポイント: http://localhost:25326
```

### データベースマイグレーション

マイグレーションは自動的に実行されます（Docker起動時）。

手動実行:

```bash
cd performers/services/graphql
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
│       └── graphql/        # Rust GraphQLサービス
│           ├── migrations/
│           │   └── 001_storyboard_schema.sql
│           └── src/
│               ├── schema/     # GraphQLスキーマ定義
│               ├── resolvers/  # GraphQLリゾルバー
│               └── ports/      # データベース接続
└── src/                    # SvelteKit frontend
    ├── app/
    ├── components/
    └── lib/
        └── graphql/        # GraphQLクエリ・ミューテーション
```

## API

### GraphQL エンドポイント

- `http://localhost:25325/graphql` (GraphQL)

### 主要な操作

- プロジェクト作成・一覧取得
- ストーリーボード作成・編集
- シーン追加・編集・削除
- 動画生成（OpenAI API）
- 動画ステータス確認

## テスト

### テスト構造

- **BDDテスト**: `tests/bdd/` - Cucumberを使用したビヘイビア駆動テスト
  - `features/` - Gherkin形式のフィーチャーファイル（capabilities.jsonldベース）
  - `step_definitions/` - ステップ定義（TypeScript）
- **TDDテスト**: `tests/tdd/` - Vitestを使用したテスト駆動開発テスト
  - `unit/` - ユニットテスト（コンポーネントなど）
  - `integration/` - 統合テスト（GraphQL APIなど）

### テストの実行

```bash
# TDD: ユニットテストとコンポーネントテスト
pnpm test

# TDD: ウォッチモード
pnpm test:watch

# TDD: カバレッジレポート生成
pnpm test:coverage

# TDD: 統合テスト（GraphQL APIが必要）
pnpm test:integration

# BDD: Cucumberテスト（GraphQL APIが必要）
pnpm test:bdd
```

### テストカバレッジ

カバレッジレポートは `coverage/` ディレクトリに生成されます。

```bash
# カバレッジレポートを開く
open coverage/index.html
```

### テストの書き方

#### TDDユニットテスト例

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MyComponent from '$lib/components/MyComponent.svelte';

describe('MyComponent', () => {
  it('should render', () => {
    render(MyComponent, { props: { title: 'Test' } });
    expect(screen.getByText('Test')).toBeDefined();
  });
});
```

#### TDD統合テスト例

```typescript
import { describe, it, expect } from 'vitest';
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('http://localhost:25325/graphql');

describe('GraphQL API', () => {
  it('should query projects', async () => {
    const query = `query { projects { id title } }`;
    const result = await client.request(query);
    expect(result.projects).toBeDefined();
  });
});
```

#### BDDフィーチャーファイル例

```gherkin
機能: プロジェクト管理
  シナリオ: プロジェクト一覧を取得する
    前提 GraphQL APIが起動している
    もし ユーザーがプロジェクト一覧をリクエストする
    ならば プロジェクトのリストが返される
```

## ライセンス

Private
