# Storyboard Editor (Ghibli Style)

ジブリスタイルの絵コンテ編集アプリ。`251121/storyboard.jsonld` を編集・更新できます。

## アーキテクチャ

- **Frontend**: SvelteKit 5 + ConnectRPC (connect-web)
- **Backend**: Go + ConnectRPC (connect-go) + Temporal
- **Protocol**: gRPC (via ConnectRPC)
- **Data Format**: JSON-LD

## 開発セットアップ

### 1. 依存関係のインストール

```bash
# Frontend
cd 251121/apps/260123-storyboard
pnpm install

# Backend
cd backend
go mod download
```

### 2. Protoファイルの生成

**buf CLI のインストールが必要です:**
```bash
# macOS
brew install bufbuild/buf/buf

# または公式サイトから: https://buf.build/docs/installation
```

**Protoファイルを生成:**
```bash
cd backend
buf generate
```

これにより以下が生成されます:
- `backend/proto/*.pb.go` (Go)
- `backend/proto/*_connect.go` (ConnectRPC Go)
- `src/lib/gen/*.ts` (TypeScript)

### 3. 開発サーバーの起動

**Backend** (ポート 8081):
```bash
cd backend
export WORKSPACE_ROOT=../../..
export PORT=8081
go run cmd/server/main.go
```

**Frontend** (ポート 1421):
```bash
pnpm run dev
```

ブラウザで `http://localhost:1421` を開きます。

## UI/UX

ジブリスタイルの絵コンテレイアウト:

- **カット列**: カット番号（76, 77, つづきなど）
- **画列**: 画像表示エリア + ビジュアルノート + カメラ指示
- **内容列**: キャラクター、環境、台詞、説明
- **秒列**: 時間（秒）

各パネルをダブルクリックで編集モードに入ります。

## API

### StoryboardService

- `LoadStoryboard`: ストーリーボードJSON-LDを読み込む
- `UpdatePanel`: パネルを更新
- `SaveStoryboard`: ストーリーボードJSON-LDを保存
- `GetEpisodes`: エピソード一覧を取得
- `GetEpisodePanels`: エピソードのパネル一覧を取得

## ファイル構造

```
260123-storyboard/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   └── service/
│   │       └── storyboard.go
│   ├── proto/
│   │   └── storyboard.proto
│   ├── buf.yaml
│   ├── buf.gen.yaml
│   └── go.mod
├── src/
│   ├── components/
│   │   └── Storyboard/
│   │       ├── StoryboardEditor.svelte
│   │       ├── StoryboardPage.svelte
│   │       └── StoryboardPanel.svelte
│   ├── lib/
│   │   └── client/
│   │       └── storyboard-client.ts
│   └── routes/
│       ├── +layout.ts
│       └── +page.svelte
├── package.json
├── svelte.config.js
└── vite.config.ts
```

## Temporal Worker

非同期処理用のTemporal Workerを起動:

```bash
cd backend
export TEMPORAL_ADDRESS=localhost:7233
go run cmd/worker/main.go
```

## 今後の拡張

- [x] Temporal workflows による非同期処理（基本実装完了）
- [ ] MCP統合（JSON-LD編集支援） - `github.com/mark3labs/mcp-go` を使用して実装予定
- [ ] リアルタイムコラボレーション（StreamUpdates）
- [ ] 画像アップロード・表示
- [ ] 履歴管理・バージョン管理
- [ ] AI支援による絵コンテ生成（LLM統合）

## MCP統合計画

MCP (Model Context Protocol) を使用してJSON-LD編集を支援する機能を追加予定:

- JSON-LD構造の検証
- キャラクター・環境の自動補完
- 台詞の提案・改善
- カメラ指示の生成
