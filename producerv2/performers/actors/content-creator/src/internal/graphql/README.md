# GraphQL Client Usage

このディレクトリには、GraphQL Codegenで生成された型定義とGraphQLクライアントが含まれています。

## セットアップ

1. 依存関係をインストール:
```bash
pnpm install
```

2. GraphQLスキーマから型を生成:
```bash
pnpm codegen
```

3. 開発中は自動生成を有効にする:
```bash
pnpm codegen:watch
```

## 使用方法

### クエリの実行

```typescript
import { graphqlRequest } from '@/internal/graphql';
import { GetStoriesDocument } from '@/generated/graphql';

// すべてのStoryを取得
const result = await graphqlRequest(GetStoriesDocument);
console.log(result.stories);
```

### ミューテーションの実行

```typescript
import { graphqlRequest } from '@/internal/graphql';
import { CreateStoryDocument } from '@/generated/graphql';

// Storyを作成
const result = await graphqlRequest(CreateStoryDocument, {
  variables: {
    title: 'My Story',
    content: 'Story content here...',
  },
});
console.log(result.createStory);
```

### 変数付きクエリ

```typescript
import { graphqlRequest } from '@/internal/graphql';
import { GetStoryDocument } from '@/generated/graphql';

// 特定のStoryを取得
const result = await graphqlRequest(GetStoryDocument, {
  variables: {
    id: 'Story_123',
  },
});
console.log(result.story);
```

## GraphQLファイルの追加

新しいクエリやミューテーションを追加する場合:

1. `src/internal/graphql/queries/` または `src/internal/graphql/mutations/` に `.graphql` ファイルを作成
2. `pnpm codegen` を実行して型を再生成
3. 生成された型をインポートして使用

## 環境変数

GraphQL APIのURLは以下の環境変数で設定できます:

- `NEXT_PUBLIC_GRAPHQL_API_URL` (クライアント側)
- `GRAPHQL_API_URL` (サーバー側)

デフォルト: `http://localhost:8080/graphql`

