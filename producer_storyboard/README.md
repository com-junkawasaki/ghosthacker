# Sora Storyboard Video Generator

Soraのストーリーボード機能を参考に、シーン単位で動画を生成・結合する動画生成サービス。

## アーキテクチャ

- **Backend**: Rust (async-graphql/Poem) + PostgreSQL 16
- **Frontend**: SvelteKit 2.x + Houdini (GraphQL)
- **AI**: OpenAI API (動画生成)

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

`.envrc`ファイルを作成:

```bash
export OPENAI_API_KEY=your_openai_api_key_here
export DATABASE_URL=postgresql://postgres:postgres@localhost:5435/postgres
export PUBLIC_GRAPHQL_API_URL=http://localhost:25325/graphql
export GRAPHQL_API_URL=http://localhost:25325/graphql
```

### 手動セットアップ

```bash
# 依存関係のインストール
pnpm install
cd performers/services/graphql && cargo fetch && cd ../../..

# GraphQLスキーマ生成（Houdini）
pnpm graphql:generate

# Docker Composeで全サービスを起動
docker-compose up

# 個別に起動する場合
# Backend
cd performers/services/graphql
cargo run

# Frontend
pnpm dev
```

## 開発

### GraphQLスキーマ生成

```bash
# HoudiniでGraphQL型を生成
pnpm graphql:generate

# バックエンドからスキーマを取得
pnpm graphql:fetch-schema
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
