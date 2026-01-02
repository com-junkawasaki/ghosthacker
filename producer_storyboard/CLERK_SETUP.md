# Clerk 統合セットアップ手順

## 実装完了項目

### フロントエンド（SvelteKit）

✅ `package.json` に `svelte-clerk` を追加
✅ `src/routes/+layout.server.ts` を作成（Clerk 設定の読み込み）
✅ `src/routes/+layout.svelte` に `ClerkProvider` を追加
✅ `src/lib/graphql/client.ts` で Clerk トークンの処理を準備
✅ `src/routes/api/graphql/+server.ts` で Clerk セッションをバックエンドに転送
✅ `src/hooks.server.ts` で Clerk セッションの処理
✅ `src/app.d.ts` で型定義を追加

### バックエンド（Rust GraphQL）

✅ `Cargo.toml` に `clerk-rs` を追加（poem フィーチャー付き）
✅ `src/ports/clerk.rs` を作成（Clerk 認証情報の構造体とヘルパー関数）
✅ `src/main.rs` で Clerk 認証コンテキストを GraphQL に注入
✅ リゾルバーで使用可能なヘルパー関数を実装

## 次のステップ

### 1. パッケージのインストール

```bash
# フロントエンド
npm install

# バックエンド
cd performers/services/graphql
cargo build
```

### 2. 環境変数の設定

`.envrc` または `.env` ファイルに以下を追加：

```bash
# Clerk 認証設定
export CLERK_PUBLISHABLE_KEY="pk_test_..."
export CLERK_SECRET_KEY="sk_test_..."
```

SvelteKit では、`PUBLIC_` プレフィックスが必要な場合があります：

```bash
export PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Clerk Dashboard での設定

1. [Clerk Dashboard](https://dashboard.clerk.com) にログイン
2. アプリケーションを作成または選択
3. Publishable Key と Secret Key を取得
4. 環境変数に設定

### 4. データベーススキーマの更新（オプション）

組織スコープのデータアクセスを実現するには、データベーステーブルに `org_id` カラムを追加：

```sql
-- マイグレーション例
ALTER TABLE storyboard_projects 
ADD COLUMN org_id VARCHAR(255);

CREATE INDEX idx_storyboard_projects_org_id ON storyboard_projects(org_id);
```

### 5. リゾルバーでの使用例

```rust
use crate::ports::clerk::{require_auth, require_org, require_auth_and_org};

#[Object]
impl QueryRoot {
    async fn my_projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
        // ユーザーと組織の認証を要求
        let (user, org) = require_auth_and_org(ctx)?;
        
        // 組織IDでフィルタリング
        let pool = ctx.data::<PostgresPool>()?;
        let rows = sqlx::query(
            "SELECT * FROM storyboard_projects WHERE org_id = $1",
        )
        .bind(&org.id)
        .fetch_all(pool.as_ref())
        .await?;
        
        // ...
    }
}
```

## トラブルシューティング

### フロントエンドでエラーが発生する場合

1. `svelte-clerk` がインストールされているか確認
2. `CLERK_PUBLISHABLE_KEY` が正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

### バックエンドでエラーが発生する場合

1. `clerk-rs` が `Cargo.toml` に追加されているか確認
2. `CLERK_SECRET_KEY` が正しく設定されているか確認
3. コンパイルエラーを確認: `cargo check`

### 認証情報が取得できない場合

1. リクエストヘッダーに `Authorization: Bearer <token>` が含まれているか確認
2. `X-Org-Id` ヘッダーが設定されているか確認
3. Clerk Dashboard でアプリケーション設定を確認

## 参考資料

- [svelte-clerk Documentation](https://svelte-clerk.netlify.app/)
- [clerk-rs Documentation](https://docs.rs/clerk-rs/)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [CLERK_INTEGRATION.md](./CLERK_INTEGRATION.md) - 詳細な使用方法


