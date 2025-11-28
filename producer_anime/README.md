# OWL-based LLM Content Generator with YouTube Pipeline

TerminusDBとOWLオントロジーを活用した、storyからYouTube動画までの制作パイプラインを統合するコンテンツジェネレーター。

## 概要

JSON-LD形式のstory入力から、YouTube動画アップロードまでを統合した制作パイプラインを構築。複数のLLMプロバイダー（GPT-5, Claude, Ollama）とメディア生成ツール（GPT Image, Hume TTS, RunwayML）を切り替え可能に設計。

## 技術スタック

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict mode)
- **Database**: TerminusDB (OWL/RDF), PostgreSQL (メタデータ)
- **Backend**: Rust (async-graphql), Node.js (API Routes)
- **LLM**: OpenAI GPT-5, Anthropic Claude, Ollama
- **Media**: GPT (画像), Hume (音声), RunwayML (動画)
- **YouTube**: YouTube Data API v3
- **UI Components**: TerminusDB Documents UI SDK

## プロジェクト構造

```
/
├── PROJECT.jsonld          # プロジェクトメタデータ
├── capabilities.jsonld     # システム能力定義
├── activities.jsonld       # アクティビティ定義
├── performers/
│   ├── actors/
│   │   └── content-creator/    # UI Actor
│   ├── services/
│   │   └── graphql/             # GraphQL Service
│   └── systems/
│       ├── terminusdb/         # TerminusDB System
│       └── database/           # PostgreSQL System
└── src/
    ├── app/                    # Next.js App Router
    └── internal/               # 内部モジュール
        ├── providers/          # LLM/Media プロバイダー
        ├── terminusdb/         # TerminusDB クライアント
        └── pipeline/           # パイプライン実行エンジン
```

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

```bash
cp .envrc.example .envrc
# .envrcを編集してAPIキーを設定
```

### 3. Docker Composeでサービス起動

```bash
docker-compose up -d
```

### 4. 開発サーバー起動

```bash
pnpm dev
```

## 開発

### TypeScript型チェック

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
pnpm lint:fix
```

### GraphQL Codegen

```bash
pnpm codegen
pnpm codegen:watch
```

## ライセンス

Private

