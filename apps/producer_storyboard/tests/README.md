# テストガイド

このプロジェクトでは、BDD（Behavior-Driven Development）とTDD（Test-Driven Development）の両方のアプローチを使用しています。

## テスト構造

```
tests/
├── bdd/                    # BDDテスト（Cucumber）
│   ├── features/          # Gherkin形式のフィーチャーファイル
│   ├── step_definitions/  # ステップ定義（TypeScript）
│   └── reports/           # Cucumberレポート（.gitignore）
├── tdd/                    # TDDテスト（Vitest）
│   ├── unit/              # ユニットテスト
│   │   ├── components/    # コンポーネントテスト
│   │   └── graphql/       # GraphQLクエリ/ミューテーションテスト
│   └── integration/       # 統合テスト
│       └── graphql-api.test.ts
└── setup.ts               # テストセットアップファイル
```

## テストの実行

### TDDテスト

```bash
# すべてのTDDテストを実行
pnpm test

# ユニットテストのみ
pnpm test -- tests/tdd/unit

# 統合テストのみ（GraphQL APIが必要）
pnpm test:integration

# ウォッチモード
pnpm test:watch

# カバレッジレポート生成
pnpm test:coverage
```

### BDDテスト

```bash
# BDDテストを実行（GraphQL APIが必要）
pnpm test:bdd

# 特定のフィーチャーのみ実行
pnpm test:bdd tests/bdd/features/project-management.feature
```

## capabilities.jsonldとの関係

すべてのテストは`capabilities.jsonld`で定義されたcapabilityに基づいています：

- **Project Management**: `tests/bdd/features/project-management.feature`
- **Storyboard Editing**: `tests/bdd/features/storyboard-editing.feature`
- **Scene Management**: `tests/bdd/features/scene-management.feature`
- **AI Video Generation**: `tests/bdd/features/video-generation.feature`

## テストの書き方

### TDDユニットテスト

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### TDD統合テスト

```typescript
import { describe, it, expect } from 'vitest';
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('http://localhost:25325/graphql');

describe('GraphQL API', () => {
  it('should query projects', async () => {
    const query = `query { projects { id } }`;
    const result = await client.request(query);
    expect(result.projects).toBeDefined();
  });
});
```

### BDDフィーチャーファイル

```gherkin
機能: プロジェクト管理
  シナリオ: プロジェクト一覧を取得する
    前提 GraphQL APIが起動している
    もし ユーザーがプロジェクト一覧をリクエストする
    ならば プロジェクトのリストが返される
```

## テストカバレッジ

カバレッジレポートは`coverage/`ディレクトリに生成されます。

```bash
# カバレッジレポートを開く
open coverage/index.html
```

## 注意事項

- 統合テストとBDDテストを実行するには、GraphQL APIが起動している必要があります
- テストデータは各テスト実行前にクリーンアップされます
- Svelte 5 runes modeのため、コンポーネントテストは基本的なデータ構造のテストに焦点を当てています
