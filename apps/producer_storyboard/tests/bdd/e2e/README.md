# BDD E2E テスト

Playwrightを使用したブラウザベースのE2Eテストです。

## Clerk認証の設定

ClerkのPlaywrightテストガイドに基づいて認証を設定しています。

### 必要な環境変数

`.env`または`.env.test`に以下を設定：

```bash
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### セットアップ

1. `@clerk/testing`パッケージがインストールされていることを確認：
   ```bash
   pnpm add -D @clerk/testing
   ```

2. グローバルセットアップが実行されます（`BeforeAll`フックで自動実行）

3. 各テストで`setupClerkTestingToken()`が自動的に呼び出されます

## 実行方法

```bash
# すべてのE2Eテストを実行
pnpm test:bdd:e2e

# 特定のフィーチャーのみ実行
pnpm test:bdd:e2e tests/bdd/e2e/features/scenario-management-e2e.feature

# ヘッドレスモードで実行
HEADLESS=true pnpm test:bdd:e2e

# Playwrightネイティブテスト実行
pnpm test:e2e
```

## テスト構成

### フィーチャーファイル (`tests/bdd/e2e/features/`)

- `authentication.feature`: 認証フローのテスト
- `project-management-e2e.feature`: プロジェクト管理のE2Eテスト
- `scenario-management-e2e.feature`: シナリオ管理のE2Eテスト
- `sign-in-flow.feature`: サインインフローの詳細テスト
- `sign-in-visual.feature`: ビジュアル確認テスト（スクリーンショット）

### ステップ定義 (`tests/bdd/e2e/step_definitions/`)

- `browser-steps.ts`: Playwrightを使用したブラウザ操作のステップ定義（Clerk認証含む）
- `scenario-steps.ts`: シナリオ管理のステップ定義

## Clerk認証の使用方法

### 認証済みユーザーとしてテストを実行

```gherkin
シナリオ: 認証済みユーザーがシナリオを作成する
  前提 ブラウザが起動している
  かつ アプリケーションが起動している
  かつ ユーザーが認証済みである
  もし ユーザーがプロジェクト「project-123」のシナリオページにアクセスしている
  ならば シナリオ一覧が表示される
```

`ユーザーが認証済みである`ステップが自動的に`setupClerkTestingToken()`を呼び出します。

## トラブルシューティング

### Bot traffic detected エラー

`setupClerkTestingToken()`が正しく呼び出されているか確認してください。`BeforeAll`フックで`clerkSetup()`が実行されている必要があります。

### 認証が失敗する

1. 環境変数が正しく設定されているか確認：
   ```bash
   echo $CLERK_PUBLISHABLE_KEY
   echo $CLERK_SECRET_KEY
   ```

2. ClerkのインスタンスがDevelopmentモードであることを確認

3. ブラウザのコンソールでエラーを確認

### Testing Tokenが取得できない

- Developmentインスタンスを使用していることを確認
- `CLERK_PUBLISHABLE_KEY`と`CLERK_SECRET_KEY`が正しく設定されていることを確認
- `BeforeAll`フックで`clerkSetup()`が実行されていることを確認

## 参考リンク

- [Clerk Playwright Testing Guide](https://clerk.com/docs/guides/development/testing/playwright/overview)
- [Testing Tokens](https://clerk.com/changelog/2024-04-24-testing-tokens)
- [Test Authenticated Flows](https://clerk.com/docs/testing/playwright/test-authenticated-flows)
