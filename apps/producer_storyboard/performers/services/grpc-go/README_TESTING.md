# Testing Guide

## テストの種類

### ユニットテスト
通常のテストファイル（`*_test.go`）はユニットテストとして実行されます。

```bash
go test ./...
```

### 統合テスト
`// +build integration` タグが付いたテストファイルは統合テストとして実行されます。
統合テストは実際のデータベース接続や API 接続を必要とします。

```bash
# 統合テストを実行
go test -tags=integration ./...

# 特定の統合テストを実行
go test -tags=integration -run TestHiggsfieldService_GenerateImage_Integration ./internal/services/...
```

## 環境変数

### 統合テストに必要な環境変数

- `DATABASE_URL`: PostgreSQL データベース接続 URL
- `HIGGSFIELD_API_KEY`: Higgsfield API キー（または `HIGGSFIELD_KEY`）
- `HIGGSFIELD_API_SECRET`: Higgsfield API シークレット（オプション）
- `OPENAI_API_KEY`: OpenAI API キー（OpenAI テスト用）

### 例

```bash
export DATABASE_URL="postgres://user:password@localhost:5432/testdb"
export HIGGSFIELD_API_KEY="your-api-key"
export HIGGSFIELD_API_SECRET="your-api-secret"

go test -tags=integration ./...
```

## Makefile の使用

```bash
# ユニットテストのみ
make -f Makefile.test test-unit

# 統合テストのみ
make -f Makefile.test test-integration

# すべてのテスト
make -f Makefile.test test-all

# カバレッジレポート生成
make -f Makefile.test test-coverage
```

## テストの構造

### ユニットテスト
- `internal/services/higgsfield_test.go`: Higgsfield サービスのユニットテスト
- `internal/temporal/activities/generation_test.go`: Temporal アクティビティのユニットテスト

### 統合テスト
- `internal/services/higgsfield_integration_test.go`: Higgsfield サービスの統合テスト
- `internal/temporal/activities/generation_integration_test.go`: Temporal アクティビティの統合テスト

## エラーハンドリング

統合テストでは、以下のエラータイプが使用されます：

- `HiggsfieldError`: API エラー（ステータスコード、メッセージ、詳細を含む）
- `TaskPollError`: タスクポーリングエラー（リトライ情報を含む）

エラーは適切にラップされ、コンテキスト情報が含まれます。

## リトライロジック

`pollTaskStatus` 関数は指数バックオフとジッターを使用してリトライします：

- 初期遅延: 2秒
- 最大遅延: 30秒
- バックオフ乗数: 1.5
- ジッター: 最大 500ms（crypto/rand を使用）

これにより、スロットリングを回避し、効率的なポーリングが可能になります。
