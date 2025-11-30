# gRPC Client Documentation

## 概要

このディレクトリには、gRPC-Webクライアントの実装が含まれています。

## ファイル構成

- `client.ts` - 基本的なgRPC-Webクライアント実装
- `error.ts` - エラーハンドリングユーティリティ
- `manga-editor.ts` - Manga Editorサービスのクライアントラッパー
- `generated/` - protoファイルから自動生成された型定義とクライアント

## 使用方法

### 基本的な使用例

```typescript
import { mangaEditorServiceClient } from '@/lib/grpc/manga-editor';

// プロジェクト一覧を取得
const response = await mangaEditorServiceClient.ListProjects({});
console.log(response.projects);

// プロジェクトを作成
const project = await mangaEditorServiceClient.CreateProject({
  title: 'My Project',
  description: 'Project description',
});
```

### React Hooksの使用

```typescript
import { useGrpcProjects } from '@/hooks/useGrpcProjects';

function MyComponent() {
  const { projects, loading, error, refetch } = useGrpcProjects();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.title}</div>
      ))}
    </div>
  );
}
```

## エラーハンドリング

gRPCエラーは`GrpcError`型として扱われます：

```typescript
import { getGrpcErrorMessage, isNetworkError, isClientError } from '@/lib/grpc/error';

try {
  await mangaEditorServiceClient.GetProject({ id: projectId });
} catch (err) {
  const message = getGrpcErrorMessage(err);
  
  if (isNetworkError(err)) {
    // ネットワークエラー（サーバー接続不可など）
    console.error('Network error:', message);
  } else if (isClientError(err)) {
    // クライアントエラー（無効なリクエストなど）
    console.error('Client error:', message);
  } else {
    // サーバーエラー
    console.error('Server error:', message);
  }
}
```

## 型生成

protoファイルからTypeScript型を生成するには：

```bash
pnpm grpc:generate
```

生成されたファイルは`generated/`ディレクトリに出力されます。

## 環境変数

- `NEXT_PUBLIC_GRPC_API_URL` - gRPCサーバーのURL（デフォルト: `http://localhost:25327`）

