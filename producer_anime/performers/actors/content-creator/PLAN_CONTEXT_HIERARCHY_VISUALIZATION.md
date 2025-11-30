# Graph Context & Hierarchy Visualization Plan

## 概要
Graphページ内で、どのノードがcontextになっているか、階層構造も可視化する機能を実装します。
Force-directed layoutとLayer layoutを組み合わせたハイブリッドレイアウトを使用します。

## 実装内容

### 1. Context検出機能
- JSON-LDの`@context`プロパティを持つノードを識別
- `jsonld`フィールドから`@context`を抽出
- Contextノードを特別な視覚表現で表示（色、形状、アイコン）

### 2. 階層構造の構築
- エッジの関係から階層を構築（親子関係、包含関係）
- エッジの`label`や`properties`から階層タイプを判定
- 階層レベル（depth）を計算

### 3. Force-directed + Layer Layout
- **Force-directed layout**: ノード間の力学的配置
  - エッジで接続されたノード間の引力
  - ノード間の反発力
  - Contextノードへの特別な引力
- **Layer layout**: 階層に基づいたY座標の制約
  - 同じ階層レベルのノードを同じY座標範囲に配置
  - 階層が深いほど下に配置
  - **Context layer**: Contextノードがその下層の全てのノードを包含する構造
    - Contextノードは包含範囲の最上部に配置
    - Contextノードの下に、そのcontextを使用する全てのノードが配置される
    - Contextノードから下層への包含関係を視覚的に表現（背景色、境界線、グループ化）

### 4. 視覚的表現
- **Contextノード**: 
  - 色: 金色/オレンジ色（`#f59e0b`）
  - 形状: 六角形または特別なアイコン
  - サイズ: 通常より大きく
- **Context Layer（包含領域）**:
  - Contextノードの下層を包含する背景色（半透明のオレンジ/金色）
  - Contextノードから下層への境界線（点線または実線）
  - Contextノードのラベルと包含範囲の表示
  - 複数のcontext layerが重なる場合は、透明度を調整して重ねて表示
- **階層レベル**:
  - 各レイヤーに背景色を追加（薄いグレー）
  - レイヤーラベルを表示
- **エッジ**:
  - 階層関係を示すエッジは太めに
  - Context関係を示すエッジは点線で
  - Contextノードから下層ノードへの包含関係を視覚的に表現

## 変更ファイル

### 1. `GraphVisualization.tsx`
- Context検出ロジックの追加
- 階層構造構築ロジックの追加
- Force-directed + Layer layoutアルゴリズムの実装
- 視覚的表現の更新（contextノード、階層レイヤー）

### 2. 新しいユーティリティ関数
- `analyzeContextNodes()`: JSON-LDからcontextノードを検出
- `buildHierarchy()`: エッジから階層構造を構築
- `calculateLayerLayout()`: 階層に基づいたY座標を計算
- `forceDirectedLayout()`: 力学的配置を計算

## 実装詳細

### Context検出
```typescript
interface ContextNode extends GraphNode {
  isContext: boolean;
  contextData?: {
    version?: number;
    prefixes?: Record<string, string>;
  };
}

function analyzeContextNodes(nodes: GraphNode[]): ContextNode[] {
  return nodes.map(node => {
    const jsonld = typeof node.properties.jsonld === 'string' 
      ? JSON.parse(node.properties.jsonld) 
      : node.properties.jsonld;
    
    const hasContext = jsonld && jsonld['@context'];
    
    return {
      ...node,
      isContext: !!hasContext,
      contextData: hasContext ? extractContextData(jsonld['@context']) : undefined,
    };
  });
}
```

### 階層構築
```typescript
interface HierarchyNode extends GraphNode {
  depth: number;
  parent?: string;
  children: string[];
  contextId?: string; // このノードが属するcontextノードのID
}

interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[]; // このcontextに含まれる全てのノードID
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function buildHierarchy(
  nodes: GraphNode[], 
  edges: GraphEdge[]
): {
  hierarchy: Map<string, HierarchyNode>;
  contextLayers: ContextLayer[];
} {
  // 1. Contextノードを識別
  // 2. エッジから親子関係を構築
  // 3. 各ノードがどのcontextに属するかを判定
  // 4. Context layerの包含範囲を計算
  // 5. 階層の深さを計算（contextノードを基準に）
}
```

### Force-directed + Layer Layout
```typescript
function calculateLayout(
  nodes: HierarchyNode[],
  edges: GraphEdge[],
  contextLayers: ContextLayer[],
  width: number,
  height: number
): {
  positions: Map<string, { x: number; y: number }>;
  contextLayerBounds: Map<string, { minX: number; minY: number; maxX: number; maxY: number }>;
} {
  // 1. Layer layout: 階層に基づいてY座標を初期化
  //    - Contextノードを各context layerの最上部に配置
  //    - Contextノードの下に、そのcontextに属するノードを配置
  // 2. Force-directed: 反復的に位置を更新
  //    - Contextノードとその下層ノード間の引力を強く設定
  //    - Context layer内のノードが境界を超えないように制約
  // 3. Context layerの包含範囲を計算
  //    - 各context layerの境界（minX, minY, maxX, maxY）を計算
  //    - パディングを追加して視覚的に見やすくする
}
```

## UI追加要素

### 1. レイヤー表示
- 各階層レイヤーに背景色とラベル
- レイヤー番号または名前を表示

### 2. Contextノードのハイライト
- Contextノードをクリックすると、そのcontextを使用しているノードをハイライト
- Contextノードの詳細をサイドパネルで表示

### 3. 階層ビュー切り替え
- トグルボタンで階層ビュー/通常ビューの切り替え
- 階層ビューではレイヤー背景を表示
- Context layerの包含範囲を視覚的に表示

### 4. Context Layerの描画
- Contextノードの下層を包含する背景領域を描画
- 半透明の背景色で包含範囲を表示
- Contextノードから下層への境界線を描画
- Context layerのラベルを表示（contextノード名）
- 複数のcontext layerが重なる場合は、透明度を調整して重ねて表示

## 実装手順

1. Context検出機能の実装
2. 階層構築ロジックの実装
3. Force-directed + Layer layoutアルゴリズムの実装
4. 視覚的表現の更新
5. UI要素の追加（レイヤー表示、contextハイライト）
6. パフォーマンス最適化（大量ノード対応）

