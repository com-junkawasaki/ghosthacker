# Producer v4: AI Agentを使ったマンガ制作ウェブアプリ

## プロジェクト概要

producerv3のアーキテクチャを基盤に、マンガ制作に特化した新バージョン。単一Canvas（Konva.js）でページ全体を管理し、fal.ai/DeepInfraによるモデル選択機能を実装。

## アーキテクチャ概要

- **Frontend**: Next.js 14 App Router + React 18 + react-konva + Tailwind CSS
- **Backend**: GraphQL (Poem 3/Rust) + PostgreSQL 16
- **AI Integration**: fal.ai / DeepInfra（モデル選択）、OpenAI DALL-E（オプション）
- **Canvas**: Konva.js（単一Canvas + レイヤー管理）
- **Data Model**: OWL/SHACL + RDF (JSON-LD) でマンガ構造を定義

## 実装済み機能

### 基盤構築
- ✅ Next.js 14 + TypeScript + Tailwind CSS セットアップ
- ✅ Rust GraphQL サービスセットアップ
- ✅ Docker Compose 設定
- ✅ PostgreSQL データベーススキーマ定義

### UI基盤
- ✅ TopBar（ロゴ、クレジット表示、エクスポート）
- ✅ LeftSidebar（ページ一覧、レイヤー一覧）
- ✅ RightSidebar（プロンプトタブ、ページタブ、モデルブラウザ）
- ✅ BottomToolbar（編集ツール）
- ✅ BottomRight（保存、ズーム、ヘルプ）

### Konva Canvas
- ✅ Konva Stage/Layer基本セットアップ
- ✅ ページ読み込み・表示（Stage.fromJSON()）
- ✅ パネルレンダリング（Konva Group/Image）
- ✅ レイヤー管理システム
- ✅ ページ保存（Stage.toJSON()）

### 編集ツール
- ✅ 選択ツール（Konva Transformer）
- ✅ ペンツール（Konva Line/Path）
- ✅ 消しゴムツール
- ✅ 図形ツール（Konva Rect/Circle）
- ✅ テキストツール（Konva Text）
- ✅ アンドゥ/リドゥ（Konva History）

### 吹き出しシステム
- ✅ 吹き出し追加（Konva Group + Path + Text）
- ✅ 吹き出し形状選択（speech/thought/shout）
- ✅ テキスト編集
- ✅ 位置調整（Konva Transformer）

### AI画像生成
- ✅ fal.ai / DeepInfra API統合（フロントエンド）
- ✅ モデルブラウザ（モデル一覧、検索、選択）
- ✅ パネルごとの画像生成
- ✅ 生成画像プレビュー
- ✅ パネルへの画像配置

### エクスポート機能
- ✅ PNG/JPEG エクスポート（Stage.toDataURL()）
- ✅ JSON エクスポート（Stage.toJSON()）
- ✅ PDF エクスポート（基本実装）

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
│   │   ├── manga/             # マンガエディタルート
│   │   └── providers.tsx       # Apollo Client Provider
│   ├── components/
│   │   ├── manga/
│   │   │   └── editor/        # エディタコンポーネント
│   │   │       ├── header/    # TopBar, CreditDisplay
│   │   │       ├── sidebar/   # PageSidebar, RightSidebar, PromptTab, ModelBrowser
│   │   │       ├── canvas/    # CanvasArea, Konva components
│   │   │       ├── toolbar/   # BottomToolbar, EditingTools, UndoRedo
│   │   │       └── dialogs/   # ExportDialog, ImageGenerationDialog
│   │   └── shared/ui/         # Tabs, Toggle, Badge
│   ├── lib/
│   │   ├── graphql/           # GraphQLクライアント
│   │   ├── konva/             # Konva操作ユーティリティ
│   │   ├── ai/                # AI統合（fal.ai, DeepInfra）
│   │   └── export/            # エクスポート機能
│   ├── hooks/                 # React hooks（useUndoRedo）
│   └── types/                 # TypeScript型定義
└── performers/
    └── services/
        └── graphql/           # Rust GraphQLサービス
            ├── src/
            │   ├── schema/    # GraphQLスキーマ定義
            │   ├── resolvers/ # クエリ/ミューテーション
            │   └── ports/     # PostgreSQL, fal.ai, DeepInfra統合
            └── migrations/    # データベースマイグレーション
```

## データベーススキーマ

PostgreSQL 16を使用。マイグレーションファイルは `performers/services/graphql/migrations/001_manga_schema.sql` に配置。

主要テーブル:
- `manga_projects` - マンガプロジェクト
- `manga_stories` - ストーリー
- `manga_scenes` - シーン
- `manga_scripts` - マンガスクリプト
- `manga_pages` - ページ
- `manga_panels` - パネル
- `manga_layers` - レイヤー
- `manga_speech_bubbles` - 吹き出し
- `manga_generated_images` - 生成画像
- `manga_ai_models` - AIモデル定義

## 使用方法

### マンガエディタの起動

1. プロジェクト一覧ページ（`/manga`）にアクセス
2. プロジェクトを選択または新規作成
3. エディタページ（`/manga/[projectId]/editor`）で編集開始

### 編集ツールの使用

- **選択ツール**: オブジェクトを選択して移動・リサイズ
- **ペンツール**: 自由に線を描画
- **消しゴムツール**: 描画を消去
- **図形ツール**: 四角形・円を描画
- **テキストツール**: テキストを追加

### 吹き出しの追加

1. 下部ツールバーの「吹き出しを追加」ボタンをクリック
2. 吹き出しをクリックして選択
3. 右サイドバーの「ページ」タブでテキスト・話者・形状を編集

### AI画像生成

1. 右サイドバーの「モデル」タブでモデルを選択
2. 「プロンプト」タブでプロンプトを入力
3. 「生成」ボタンをクリック
4. 生成された画像をパネルに配置

### エクスポート

1. TopBarの「Export」ボタンをクリック
2. 形式（PNG/JPEG/PDF）を選択
3. エクスポート実行

## 環境変数

```bash
# GraphQL API
NEXT_PUBLIC_GRAPHQL_API_URL=http://localhost:25326/graphql
GRAPHQL_API_URL=http://graphql:8080/graphql

# AI Services
NEXT_PUBLIC_FAL_API_KEY=your_fal_api_key
NEXT_PUBLIC_DEEPINFRA_API_KEY=your_deepinfra_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

## ライセンス

MIT

