# Clerk Integration Guide

このドキュメントでは、Clerk 認証システムの統合方法と使用方法を説明します。

## 概要

このプロジェクトでは、フロントエンド（SvelteKit）とバックエンド（Rust GraphQL）の両方で Clerk を統合しています。

- **フロントエンド**: `svelte-clerk` を使用
- **バックエンド**: `clerk-rs` を使用

## セットアップ手順

### 1. パッケージのインストール

#### フロントエンド

```bash
npm install svelte-clerk
```

#### バックエンド

```bash
cd performers/services/graphql
cargo add clerk-rs --features poem
```

## 環境変数の設定

### フロントエンド

`.env` または `.envrc` に以下を追加：

```bash
export CLERK_PUBLISHABLE_KEY="pk_test_..."
```

SvelteKit では、`PUBLIC_` プレフィックスが必要な場合があります：

```bash
export PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

### バックエンド

Rust GraphQL サービスでは、以下の環境変数を設定：

```bash
export CLERK_SECRET_KEY="sk_test_..."
export CLERK_API_URL="https://api.clerk.com"  # オプション
```

## フロントエンドでの使用方法

### 1. ClerkProvider の設定

`src/routes/+layout.svelte` で既に設定済みです。

### 2. 認証状態の取得

```svelte
<script lang="ts">
  import { getAuth, getOrganization } from 'svelte-clerk';
  
  const auth = getAuth();
  const org = getOrganization();
  
  // ユーザー情報の取得
  $: user = $auth?.user;
  $: orgId = $org?.id;
</script>
```

### 3. GraphQL リクエストへの自動追加

`src/lib/graphql/client.ts` で自動的に Clerk トークンが追加されます。

## バックエンドでの使用方法

### 1. GraphQL コンテキストから認証情報を取得

```rust
use crate::ports::clerk::{require_auth, require_org, require_auth_and_org};

#[Object]
impl QueryRoot {
    /// 認証が必要なクエリの例
    async fn my_projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
        // ユーザー認証を要求
        let user = require_auth(ctx)?;
        
        // 組織コンテキストを要求
        let org = require_org(ctx)?;
        
        // ユーザーと組織の両方を要求
        let (user, org) = require_auth_and_org(ctx)?;
        
        // データベースクエリを実行（org.id でフィルタリング）
        // ...
    }
}
```

### 2. オプショナルな認証情報の取得

```rust
use crate::ports::clerk::get_clerk_auth_from_context;

#[Object]
impl QueryRoot {
    async fn public_projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
        // 認証情報が利用可能な場合は取得
        if let Ok(auth) = get_clerk_auth_from_context(ctx) {
            if let Some(user) = auth.user {
                // 認証済みユーザー向けの処理
            }
        }
        
        // パブリックデータを返す
        // ...
    }
}
```

## 組織スコープのデータアクセス

組織ごとにユーザーを管理する場合、データベースクエリで組織IDでフィルタリングします：

```rust
async fn projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
    let (user, org) = require_auth_and_org(ctx)?;
    let pool = ctx.data::<PostgresPool>()?;
    
    // 組織IDでフィルタリング
    let rows = sqlx::query(
        r#"
        SELECT id, title, description, created_at, updated_at
        FROM storyboard_projects
        WHERE org_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(&org.id)
    .fetch_all(pool.as_ref())
    .await?;
    
    // ...
}
```

## データベーススキーマの拡張

組織スコープのデータアクセスを実現するには、データベーステーブルに `org_id` カラムを追加する必要があります：

```sql
-- マイグレーション例
ALTER TABLE storyboard_projects 
ADD COLUMN org_id VARCHAR(255) REFERENCES organizations(clerk_org_id);

CREATE INDEX idx_storyboard_projects_org_id ON storyboard_projects(org_id);
```

## セキュリティ考慮事項

1. **トークンの検証**: 本番環境では、Clerk の JWT トークンを検証する必要があります
2. **組織アクセス制御**: ユーザーが所属する組織のみにアクセスできるようにする
3. **レート制限**: Clerk API のレート制限を考慮する

## トラブルシューティング

### フロントエンドで認証情報が取得できない

- `CLERK_PUBLISHABLE_KEY` が正しく設定されているか確認
- ブラウザのコンソールでエラーを確認
- Clerk Dashboard でアプリケーション設定を確認

### バックエンドで認証情報が取得できない

- リクエストヘッダーに `Authorization: Bearer <token>` が含まれているか確認
- `X-Org-Id` ヘッダーが設定されているか確認
- Clerk のシークレットキーが正しく設定されているか確認

## 参考リンク

- [svelte-clerk Documentation](https://svelte-clerk.netlify.app/)
- [clerk-rs Documentation](https://docs.rs/clerk-rs/)
- [Clerk Dashboard](https://dashboard.clerk.com)

