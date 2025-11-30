# Drag & Drop階層編集機能実装計画

## 概要
contextとノードの階層構造をドラッグ&ドロップ（D&D）で編集できるようにします。

## 実装内容

### 1. ドラッグ&ドロップの動作拡張

#### 1.1 ノードを別のノードにドロップ
- **動作**: 親子関係を変更
- **処理**:
  - 既存の親子関係（エッジ）があれば削除
  - 新しい親子関係（エッジ）を作成
  - エッジのラベルは`hasChild`または`belongsTo`を使用

#### 1.2 ノードをcontextノードにドロップ
- **動作**: そのcontextに属するようにする
- **処理**:
  - contextノードからドロップされたノードへのエッジを作成
  - エッジのラベルは`hasContext`または`usesContext`を使用
  - 階層構造を再構築

#### 1.3 ノードをcontext layerの外（空白領域）にドロップ
- **動作**: contextから外す
- **処理**:
  - contextノードからそのノードへのエッジを削除
  - 階層構造を再構築

### 2. 視覚的フィードバック

#### 2.1 ドラッグ中の表示
- ドラッグ中のノードを半透明で表示
- ドラッグ中のノードの位置を追跡して表示

#### 2.2 ドロップ可能領域のハイライト
- **Contextノード**: オレンジ色のハイライト（contextに追加可能）
- **通常ノード**: 青色のハイライト（親子関係を作成可能）
- **空白領域**: グレーのハイライト（contextから外す）

#### 2.3 ドロッププレビュー
- ドロップ先に応じたアクションの説明を表示
  - "Add to context: [context名]"
  - "Set parent: [ノード名]"
  - "Remove from context"

### 3. エッジ削除機能の実装

#### 3.1 API Route
- `DELETE /api/grpc/graph/edge/[id]` を作成
- gRPCの`deleteGraphEdge`を呼び出す

#### 3.2 Graph Client
- `deleteGraphEdge(edgeId: string)` 関数を追加

### 4. 階層構造の更新ロジック

#### 4.1 既存の親子関係の検出
- ドロップされたノードの既存の親を検出
- その親子関係のエッジを削除

#### 4.2 新しい親子関係の作成
- ドロップ先のノードとの親子関係を作成
- エッジのラベルを適切に設定

#### 4.3 Context関係の管理
- Contextノードへのドロップ時は、context関係のエッジを作成
- 空白領域へのドロップ時は、context関係のエッジを削除

## 変更ファイル

### 1. `GraphVisualization.tsx`
- `handleDrop`関数を拡張して階層編集に対応
- ドラッグ中の視覚的フィードバックを追加
- ドロップ可能領域のハイライト機能を追加
- 既存の親子関係を検出・削除するロジックを追加

### 2. `graph_client.ts`
- `deleteGraphEdge(edgeId: string)` 関数を追加
- `updateNodeHierarchy(sourceId: string, targetId: string, action: 'add' | 'remove')` 関数を追加（オプション）

### 3. `api/grpc/graph/edge/[id]/route.ts` (新規)
- DELETEメソッドを実装
- gRPCの`deleteGraphEdge`を呼び出す

## 実装詳細

### ドロップ処理のロジック
```typescript
const handleDrop = async (e: React.DragEvent, targetNodeId?: string) => {
  e.preventDefault();
  if (!draggedNode) return;

  const draggedNodeData = nodes.find(n => n.id === draggedNode);
  if (!draggedNodeData) return;

  if (targetNodeId) {
    const targetNode = nodes.find(n => n.id === targetNodeId);
    if (!targetNode) return;

    // Contextノードへのドロップ
    if (targetNode.isContext) {
      // 既存のcontext関係を削除
      await removeFromContext(draggedNode);
      // 新しいcontext関係を作成
      await addToContext(draggedNode, targetNodeId);
    } else {
      // 通常ノードへのドロップ（親子関係）
      // 既存の親子関係を削除
      await removeParentChildRelation(draggedNode);
      // 新しい親子関係を作成
      await createParentChildRelation(targetNodeId, draggedNode);
    }
  } else {
    // 空白領域へのドロップ（contextから外す）
    await removeFromContext(draggedNode);
  }

  await loadGraphData();
  setDraggedNode(null);
};
```

### エッジ削除関数
```typescript
async function removeFromContext(nodeId: string) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node?.contextId) return;

  // contextノードからそのノードへのエッジを検索
  const contextEdge = edges.find(
    e => e.source === node.contextId && e.target === nodeId
  );
  
  if (contextEdge) {
    await deleteGraphEdge(contextEdge.id);
  }
}
```

## UI改善

### 1. ドラッグ中のカーソル
- ドラッグ中は`move`カーソルを表示

### 2. ドロップ可能領域の視覚的表示
- マウスオーバー時にハイライト
- ドロップ可能なノードを強調表示

### 3. 確認ダイアログ（オプション）
- 既存の関係を変更する際に確認ダイアログを表示

## 実装手順

1. エッジ削除APIの実装（`DELETE /api/grpc/graph/edge/[id]`）
2. `graph_client.ts`に`deleteGraphEdge`関数を追加
3. `handleDrop`関数を拡張して階層編集に対応
4. 既存の親子関係を検出・削除するロジックを実装
5. 視覚的フィードバックの追加（ドラッグ中の表示、ドロップ可能領域のハイライト）
6. 階層構造の再構築とレイアウトの更新

