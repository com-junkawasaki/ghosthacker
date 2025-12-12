# Clerk Playwright Testing Setup

ClerkのPlaywrightテストガイドに基づいたE2Eテストの認証設定

## セットアップ手順

### 1. パッケージのインストール

```bash
pnpm add -D @clerk/testing
```

### 2. 環境変数の設定

`.env`または`.env.test`に以下を設定：

```bash
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 3. グローバルセットアップ

`tests/bdd/e2e/global-setup.ts`でClerkのテスト環境をセットアップ：

```typescript
import { clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

setup.describe.configure({ mode: 'serial' });

setup('global setup', async () => {
  await clerkSetup();
});
```

### 4. Playwright設定の更新

`playwright.config.ts`に`globalSetup`を追加：

```typescript
export default defineConfig({
  globalSetup: './tests/bdd/e2e/global-setup.ts',
  // ...
});
```

### 5. テストでの認証設定

各テストで`setupClerkTestingToken()`を使用：

```typescript
import { setupClerkTestingToken } from '@clerk/testing/playwright';

test('authenticated flow', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/protected-page');
  // ...
});
```

## BDDステップ定義での使用

`tests/bdd/e2e/step_definitions/browser-steps.ts`の`ユーザーが認証済みである`ステップで使用：

```typescript
Given('ユーザーが認証済みである', async () => {
  const { setupClerkTestingToken } = await import('@clerk/testing/playwright');
  await setupClerkTestingToken({ page });
});
```

## 認証済みフローのテスト

認証状態を保存して再利用する場合：

```typescript
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/sign-in');
  // 認証処理...
  await page.context().storageState({ path: 'auth.json' });
});

// テストで認証状態を読み込む
test.use({ storageState: 'auth.json' });
```

## 参考リンク

- [Clerk Playwright Testing Guide](https://clerk.com/docs/guides/development/testing/playwright/overview)
- [Testing Tokens](https://clerk.com/changelog/2024-04-24-testing-tokens)
- [Test Authenticated Flows](https://clerk.com/docs/testing/playwright/test-authenticated-flows)
- [Test Helpers](https://clerk.com/docs/guides/development/testing/playwright/test-helpers)

## トラブルシューティング

### Bot traffic detected エラー

`setupClerkTestingToken()`を使用することで、Clerkのボット検出をバイパスできます。

### Testing Tokenが取得できない

- Developmentインスタンスを使用していることを確認
- `CLERK_PUBLISHABLE_KEY`と`CLERK_SECRET_KEY`が正しく設定されていることを確認
- `clerkSetup()`がグローバルセットアップで実行されていることを確認

### 認証が失敗する

- 環境変数が正しく設定されているか確認
- ClerkのインスタンスがDevelopmentモードであることを確認
- ブラウザのコンソールでエラーを確認
