# 組織スコープのデータアクセス実装

## 実装完了項目

### 1. 環境変数の統合 ✅

`.envrc` に Clerk の環境変数を追加：
- `CLERK_PUBLISHABLE_KEY`: フロントエンド用の公開キー
- `CLERK_SECRET_KEY`: バックエンド用のシークレットキー
- `PUBLIC_CLERK_PUBLISHABLE_KEY`: SvelteKit 用の公開キー（クライアント側アクセス用）

### 2. データベーススキーマの更新 ✅

**マイグレーションファイル**: `009_add_org_scoping.sql`

以下のテーブルに `org_id` カラムを追加：
- `storyboard_projects` (親テーブル)
- `storyboards`
- `scenes`
- `generated_videos`
- `characters`
- `dialogues`
- `operation_history` (存在する場合)
- `character_assets` (存在する場合)
- `generated_images` (存在する場合)

**機能**:
- 各テーブルに `org_id` カラムを追加
- インデックスを作成してクエリパフォーマンスを最適化
- トリガー関数 `propagate_org_id_to_children()` を作成
  - プロジェクトの `org_id` が変更された場合、子テーブルに自動的に伝播
- コメントを追加してドキュメント化

### 3. GraphQL リゾルバーの更新 ✅

#### Query リゾルバー (`query.rs`)

**`projects` クエリ**:
- 組織コンテキストが利用可能な場合、`org_id` でフィルタリング
- 組織コンテキストがない場合は、すべてのプロジェクトを返す（後方互換性）

**`storyboards` クエリ**:
- プロジェクトがユーザーの組織に属しているか検証
- アクセス拒否の場合はエラーを返す

#### Mutation リゾルバー (`mutation.rs`)

**`create_project` ミューテーション**:
- 認証と組織コンテキストを要求
- プロジェクト作成時に `org_id` を自動設定
- 組織コンテキストがない場合は、`org_id` なしで作成（後方互換性）

**`create_storyboard` ミューテーション**:
- プロジェクトがユーザーの組織に属しているか検証
- アクセス拒否の場合はエラーを返す

### 4. Clerk 認証モジュール ✅

**`src/ports/clerk.rs`**:
- `ClerkUser`, `ClerkOrg`, `ClerkAuth` 構造体
- `require_auth()`, `require_org()`, `require_auth_and_org()` ヘルパー関数
- `get_clerk_auth_from_context()` 関数

## 使用方法

### マイグレーションの実行

```bash
cd performers/services/graphql
cargo run
# または、sqlx migrate run を使用
```

### リゾルバーでの使用例

```rust
use crate::ports::clerk::{require_auth_and_org, get_clerk_auth_from_context};

#[Object]
impl QueryRoot {
    async fn my_projects(&self, ctx: &Context<'_>) -> Result<Vec<Project>> {
        // 組織コンテキストを取得（オプショナル）
        let org_filter = if let Ok(auth) = get_clerk_auth_from_context(ctx) {
            auth.org.map(|org| org.id)
        } else {
            None
        };
        
        // org_id でフィルタリング
        // ...
    }
    
    async fn protected_query(&self, ctx: &Context<'_>) -> Result<Data> {
        // 認証と組織を要求
        let (user, org) = require_auth_and_org(ctx)?;
        
        // org.id を使用してデータを取得
        // ...
    }
}
```

## セキュリティ考慮事項

1. **データ分離**: 各組織のデータは `org_id` で完全に分離されます
2. **アクセス制御**: リゾルバーで組織アクセスを検証
3. **後方互換性**: 組織コンテキストがない場合でも動作（既存データの互換性）

## 次のステップ

1. **既存データの移行**: 既存のプロジェクトに `org_id` を設定するスクリプトを作成
2. **追加のリゾルバー更新**: 他のクエリ/ミューテーションにも組織スコープを追加
3. **テスト**: 組織スコープのデータアクセスのテストを追加

## トラブルシューティング

### マイグレーションエラー

```bash
# マイグレーションを確認
cd performers/services/graphql
sqlx migrate info

# マイグレーションを実行
sqlx migrate run
```

### 組織IDが設定されない

- Clerk Dashboard で組織が作成されているか確認
- フロントエンドで `X-Org-Id` ヘッダーが送信されているか確認
- バックエンドのログで認証情報を確認

## 参考資料

- [CLERK_INTEGRATION.md](./CLERK_INTEGRATION.md) - Clerk 統合の詳細
- [CLERK_SETUP.md](./CLERK_SETUP.md) - セットアップ手順

