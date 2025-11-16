# Tests

## テストの実行

```bash
# すべてのテストを実行
pnpm test

# UI モードで実行
pnpm test:ui

# カバレッジレポートを生成
pnpm test:coverage

# ウォッチモード
pnpm test --watch
```

## テスト構造

- `tests/graphql/` - GraphQL 関連のテスト
  - `client.test.ts` - GraphQL クライアントのユニットテスト
  - `integration.test.ts` - GraphQL API への統合テスト
- `tests/mocks/` - MSW モックサーバー
  - `server.ts` - GraphQL API のモック設定

## テストの書き方

### ユニットテスト

```typescript
import { describe, it, expect } from 'vitest';
import { graphqlRequest } from '@/internal/graphql/client';

describe('graphqlRequest', () => {
  it('should make a request', async () => {
    // テストコード
  });
});
```

### 統合テスト

実際の GraphQL API が起動している必要があります。

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('GraphQL Integration', () => {
  beforeAll(() => {
    // GraphQL サービスが起動していることを確認
  });

  it('should create a project', async () => {
    // 実際の API へのリクエスト
  });
});
```

