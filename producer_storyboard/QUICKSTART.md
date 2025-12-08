# クイックスタートガイド

## 1. セットアップ

```bash
# セットアップスクリプトを実行
./scripts/setup.sh
```

## 2. 環境変数の設定

```bash
# .envrcファイルを作成
cp .envrc.example .envrc

# .envrcを編集してOPENAI_API_KEYを設定
# direnvを使用している場合
direnv allow
```

## 3. サービスの起動

### オプション1: Docker Compose（推奨）

```bash
# 全サービスを起動
make docker-up
# または
docker-compose up

# ログを確認
make docker-logs
# または
docker-compose logs -f
```

### オプション2: 個別起動

```bash
# ターミナル1: PostgreSQL
docker-compose up postgres

# ターミナル2: gRPC Backend
cd performers/services/grpc
cargo run

# ターミナル3: Frontend
pnpm dev
```

## 4. アクセス

- Frontend: http://localhost:25322
- gRPC Backend: http://localhost:25328
- PostgreSQL: localhost:5435

## 5. 使い方

1. ブラウザで http://localhost:25322 にアクセス
2. プロジェクト一覧ページが表示されます
3. 新しいプロジェクトを作成
4. ストーリーボードエディタでシーンを追加
5. 「Generate Video」ボタンで動画生成を開始

## トラブルシューティング

### gRPCコード生成エラー

```bash
# buf CLIをインストール
# macOS
brew install bufbuild/buf/buf

# その後、コード生成を再実行
pnpm grpc:generate
```

### ポートが既に使用されている

`docker-compose.yaml`のポート番号を変更してください。

### OpenAI API エラー

`.envrc`の`OPENAI_API_KEY`が正しく設定されているか確認してください。
