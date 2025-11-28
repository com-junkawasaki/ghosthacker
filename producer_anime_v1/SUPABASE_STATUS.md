# Supabase 移行ステータス

## ✅ 完了した作業

### 1. 依存関係
- ✅ `@supabase/supabase-js` 2.78.0 インストール済み
- ✅ `drizzle-orm` 0.44.7 インストール済み
- ✅ `drizzle-kit` 0.31.6 インストール済み
- ✅ `postgres` 3.4.7 インストール済み

### 2. 設定ファイル
- ✅ `drizzle.config.ts` 作成済み
- ✅ `src/infra/supabase/schema.ts` スキーマ定義済み
- ✅ `src/infra/supabase/db.ts` データベース接続設定済み
- ✅ `src/infra/supabase/client.ts` Supabase クライアント設定済み

### 3. リポジトリ実装
- ✅ `src/lib/story-supabase.ts` - StoryRepository 実装済み
- ✅ `src/infra/supabase/nodeConfigRepo.ts` - ノード設定リポジトリ実装済み
- ✅ `src/infra/supabase/artifactsRepo.ts` - アーティファクトリポジトリ実装済み

### 4. インポート更新
- ✅ `src/server/routers/story.ts` - Supabase リポジトリ使用
- ✅ `src/server/routers/canvas.ts` - Supabase リポジトリ使用
- ✅ `src/app/(producer)/canvas/actions.ts` - Supabase リポジトリ使用
- ✅ `src/pipeline/executor.ts` - Supabase リポジトリ使用

### 5. 環境変数設定
- ✅ `env.ts` - Supabase 環境変数定義済み
- ✅ `src/env.mjs` - Supabase 環境変数定義済み

## ⚠️ 必要な設定

### 1. 環境変数の設定
`.env.local` ファイルに以下を追加してください：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**現在の状態**: `.env.local` ファイルは存在しますが、Supabase の環境変数が設定されていません。

### 2. データベーススキーマの作成
Supabase プロジェクトに接続後、以下を実行：

```bash
# スキーマを Supabase にプッシュ
pnpm db:push

# または、マイグレーションファイルを生成して適用
pnpm db:generate
pnpm db:migrate
```

### 3. Supabase プロジェクトの作成（未実施の場合）
1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト設定から接続情報を取得
4. `.env.local` に設定

## 📊 データベーススキーマ

以下のテーブルが定義されています：

- `projects` - プロジェクト情報
- `narratives` - ナラティブ構造
- `characters` - キャラクター情報
- `backstories` - バックストーリー
- `episodes` - エピソード情報
- `styles` - スタイル設定
- `platforms` - プラットフォーム設定
- `canvas` - キャンバス設定
- `pipeline_nodes` - パイプラインノード設定
- `artifacts` - アーティファクト

## 🔧 利用可能なコマンド

```bash
pnpm db:generate  # マイグレーションファイルを生成
pnpm db:migrate   # マイグレーションを実行
pnpm db:push      # スキーマを直接プッシュ
pnpm db:studio    # Drizzle Studio を開く
```

## 📝 次のステップ

1. **Supabase プロジェクトの作成**（未実施の場合）
2. **環境変数の設定** - `.env.local` に Supabase の認証情報を追加
3. **データベーススキーマの作成** - `pnpm db:push` を実行
4. **動作確認** - アプリケーションを起動して接続を確認

## ⚠️ 注意事項

- Neo4j のスクリプト（`src/scripts/` 内）はまだ移行されていません。必要に応じて後で対応してください。
- `env.mjs` は一部のファイルで使用されていますが、`env.ts` がメインの設定ファイルです。

