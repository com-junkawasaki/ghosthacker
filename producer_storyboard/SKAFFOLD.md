# Skaffold Setup Guide

Skaffoldを使用してKubernetes開発ワークフローを自動化します。

## インストール

### macOS
```bash
brew install skaffold
```

### Linux/Windows
```bash
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
sudo install skaffold /usr/local/bin/
```

## クイックスタート

### 開発モード（ホットリロード）

```bash
# 開発プロファイルで起動（ホットリロード有効）
skaffold dev --profile dev

# 特定のアーティファクトのみビルド
skaffold dev --profile dev --build-artifacts producer-storyboard/grpc-go
```

### 本番モード

```bash
# 本番プロファイルでデプロイ
skaffold run --profile prod

# または、デフォルトプロファイル
skaffold run
```

## プロファイル

### dev（開発モード）
- ローカルビルド
- ホットリロード有効
- レプリカ数: 1
- イメージPullPolicy: Never（ローカルイメージを使用）

### デフォルト（本番相当）
- ローカルビルド
- レプリカ数: values.yamlの設定に従う
- イメージPullPolicy: IfNotPresent

### prod（本番モード）
- GCP Cloud Buildを使用（設定が必要）
- レプリカ数: 3
- リモートレジストリにプッシュ

## コマンド

### 開発ワークフロー

```bash
# 開発モードで起動（ファイル変更を監視）
skaffold dev --profile dev

# 一度だけビルド＆デプロイ
skaffold run --profile dev

# デバッグモード
skaffold debug --profile dev
```

### ビルド

```bash
# すべてのイメージをビルド
skaffold build

# 特定のイメージのみビルド
skaffold build --build-artifacts producer-storyboard/grpc-go
```

### デプロイ

```bash
# 既存のイメージを使用してデプロイ
skaffold deploy

# カスタムイメージタグを指定
skaffold deploy --default-repo your-registry.com
```

### テスト

```bash
# 構造テストを実行
skaffold test

# 特定のアーティファクトのみテスト
skaffold test --build-artifacts producer-storyboard/grpc-go
```

### クリーンアップ

```bash
# すべてのリソースを削除
skaffold delete

# 特定のプロファイルのみ削除
skaffold delete --profile dev
```

## 機能

### 1. 自動ビルド＆デプロイ
- コード変更を検知して自動的にビルド・デプロイ
- 開発モードではホットリロード対応

### 2. ポートフォワード
自動的に以下のポートをフォワード:
- gRPC API: `localhost:8081`
- Temporal UI: `localhost:8080`
- Temporal Frontend: `localhost:7233`

### 3. ログストリーミング
```bash
# すべてのログをストリーム
skaffold dev --profile dev

# 特定のコンポーネントのみ
skaffold dev --profile dev --tail producer-storyboard-grpc-go
```

### 4. ファイル同期
開発モードでは、以下のファイルが自動的にコンテナに同期されます:
- Goファイル（`**/*.go`）
- SQLファイル（`**/*.sql`）
- フロントエンドファイル（`src/**/*.{ts,svelte,js,css}`）

## 設定

### カスタムレジストリ

```yaml
# skaffold.yaml
build:
  local:
    push: true
  defaultRepo: your-registry.com/producer-storyboard
```

### 環境変数

```bash
# 環境変数を設定
export SKAFFOLD_DEFAULT_REPO=your-registry.com
export SKAFFOLD_NAMESPACE=producer-storyboard

# または、skaffold.yamlで設定
deploy:
  helm:
    releases:
      - name: producer-storyboard
        namespace: producer-storyboard
```

### リソース制限

`k8s/helm/producer-storyboard/values.yaml`でリソース制限を調整:

```yaml
grpcGo:
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

## トラブルシューティング

### イメージが見つからない

```bash
# ローカルイメージを確認
docker images | grep producer-storyboard

# イメージを再ビルド
skaffold build --profile dev
```

### ポートが既に使用中

```bash
# ポートフォワードを無効化
skaffold dev --profile dev --port-forward=false

# または、カスタムポート
skaffold dev --profile dev --port-forward=8082:8081
```

### デプロイが失敗する

```bash
# 詳細ログを表示
skaffold dev --profile dev --verbose

# 特定のステップをスキップ
skaffold run --profile dev --skip-tests
```

### キャッシュをクリア

```bash
# ビルドキャッシュをクリア
skaffold build --no-cache

# すべてのキャッシュをクリア
skaffold cache clear
```

## 統合

### VS Code

VS Code拡張機能をインストール:
- Skaffold Extension for VS Code

### CI/CD

GitHub Actionsの例:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: google-github-actions/setup-gcloud@v1
      - run: skaffold run --profile prod
```

## 参考資料

- [Skaffold Documentation](https://skaffold.dev/docs/)
- [Skaffold Best Practices](https://skaffold.dev/docs/workflows/)
- [Skaffold Examples](https://github.com/GoogleContainerTools/skaffold/tree/main/examples)
