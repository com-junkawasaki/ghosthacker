# 統合IR（Symbolic + Graph + Vector）仕様書

## 概要

本仕様は、JSON-LDベースの統合IR（Intermediate Representation）を定義します。このIRは、**Symbolic Layer（記号・意味）**、**Graph Layer（構造・関係）**、**Vector Layer（埋め込み空間）**の3つのレイヤを統合し、クロスモーダル（テキスト/画像/動画）な表現を可能にします。

## 設計思想

> 「JSON-LDにTypeDB的な関係性を載せて、さらにcontext graphをembeddingしてcross-modalに使える"統合IR（Symbolic + Graph + Vector）"を設計する」

### 3レイヤ構造

1. **Symbolic Layer（記号・意味）**
   - JSON-LDで **Entity / Relation / Attribute / Type** を表現
   - TypeDB風の型付き世界観
   - `@id`, `@type`, `@context`による意味的構造化

2. **Graph Layer（構造・関係）**
   - JSON-LDをそのまま「グラフビュー」として扱う
   - Node = `@id` を持つ Entity / Relation
   - Edge = `relation` / `references` / `scene includes character` など
   - 関係性の探索と推論が可能

3. **Vector Layer（埋め込み空間）**
   - 各 Node（+ 場合によっては Edge）に対して
     - `embeddingId`: ベクトルDBのキー
     - `embedHint`: 埋め込み計算用の英語中心テキスト
     - `llmLabel`: LLM用の自然文説明
   - 近傍探索とクロスモーダルマッピング（テキスト↔画像↔動画）

この3つが **"1つのJSON-LDファイル（もしくはコレクション）" に共存**します。

## 基本コンセプト

### Entity Type（エンティティ型）

- `World`: 世界観・設定
- `Character`: キャラクター
- `Location`: 場所・ロケーション
- `Organization`: 組織・グループ
- `Object`: 物体・アイテム
- `Scene`: シーン（テキスト/脚本単位）
- `Shot`: ショット（動画カット単位）
- `Concept`: 概念・テーマ

### Relation Type（関係型）

- `AppearsIn`: 登場関係（Character → Scene）
- `WorksFor`: 所属関係（Character → Organization）
- `Opposes`: 対立関係（Character → Character）
- `Mentors`: 指導関係（Character → Character）
- `Controls`: 支配関係（Character → Object/Organization）
- `LocatedIn`: 位置関係（Entity → Location）
- `Causes`: 因果関係（Event → Event）
- `Reveals`: 開示関係（Scene → Concept）
- `Contains`: 包含関係（Scene → Shot, Document → Chunk）

### 共通メタ属性

すべてのEntity/Relationに共通して持てる属性：

- `llmLabel`: LLM用の自然文説明（日本語可）
- `embedHint`: 埋め込み計算用の英語中心テキスト
- `imagePrompt`: SDXL/画像生成用プロンプト
- `videoPrompt`: Runway/Sora用動画生成プロンプト
- `embeddingId`: ベクトルDBのキー（実ベクトルは別ストア）

## JSON-LDスキーマ構造

### @context定義

```json
{
  "@context": {
    "World": "https://ghosthacker2026.com/ont/story#World",
    "Character": "https://ghosthacker2026.com/ont/story#Character",
    "Scene": "https://ghosthacker2026.com/ont/story#Scene",
    "Shot": "https://ghosthacker2026.com/ont/story#Shot",
    "Location": "https://ghosthacker2026.com/ont/story#Location",
    "Relation": "https://ghosthacker2026.com/ont/story#Relation",
    "llmLabel": "https://ghosthacker2026.com/ont/meta#llmLabel",
    "embedHint": "https://ghosthacker2026.com/ont/meta#embedHint",
    "imagePrompt": "https://ghosthacker2026.com/ont/meta#imagePrompt",
    "videoPrompt": "https://ghosthacker2026.com/ont/meta#videoPrompt",
    "embeddingId": "https://ghosthacker2026.com/ont/meta#embeddingId"
  }
}
```

### Entity共通構造

```typescript
interface Entity {
  "@id": string;           // グローバルID（"char:ghost-hacker"など）
  "@type": string;         // "Character" / "Scene" / ...
  "name"?: string;
  "llmLabel"?: string;     // LLM用自然文説明
  "embedHint"?: string;    // 埋め込み用英語テキスト
  "imagePrompt"?: string;  // 画像生成プロンプト
  "videoPrompt"?: string; // 動画生成プロンプト
  "embeddingId"?: string;  // ベクトルDBキー
  // typeごとの追加フィールド
}
```

### Character型

```typescript
interface Character extends Entity {
  "@type": "Character";
  "role": string;             // "protagonist", "antagonist", "supporting" etc.
  "traits": string[];         // ["insomniac", "ethical", ...]
  "visualProfile": {
    "age"?: number;
    "gender"?: string;
    "appearance"?: string[];  // ["hoodie", "tired-eyes", ...]
    "colorTheme"?: string;    // "blue-cyan"
  };
}
```

### Scene型

```typescript
interface Scene extends Entity {
  "@type": "Scene";
  "title": string;
  "summary": string;
  "world": string;        // World @id
  "location": string;     // Location @id
  "time"?: string;        // ISO8601 / 相対表現でも可
  "beats": string[];      // ["anomaly detected", ...]
  "characters": string[]; // Character @id 配列
}
```

### Shot型（動画用）

```typescript
interface Shot extends Entity {
  "@type": "Shot";
  "scene": string;       // Scene @id
  "order": number;       // シーン内の順序
  "durationSec"?: number;
  "camera": {
    "type": string;      // "static", "dolly-in", "pan-right"
    "angle"?: string;    // "low", "high", "eye-level"
    "distance"?: string; // "close-up", "medium", "wide"
  };
  "action": string;      // "hero typing fast", ...
  "lighting"?: string;   // "neon-blue", ...
}
```

### Relation型

```typescript
interface Relation extends Entity {
  "@type": "Relation";
  "relationType": string; // "AppearsIn", "Opposes", etc.
  "from": string;         // @id
  "to": string;           // @id
  "scene"?: string;       // 関係が現れる Scene @id
  "strength"?: number;    // 0〜1 の関係強度など
}
```

## Graph Layerの構造

Graph Layerとして見た場合：

- **ノード**: `char:*`, `scene:*`, `loc:*`, `shot:*`, `rel:*`
- **エッジ**:
  - `char` —(AppearsIn)→ `scene`
  - `scene` —(Contains)→ `shot`
  - `char` —(Mentors)→ `char`
  - `char` —(LocatedIn)→ `loc`
  - など

グラフ探索により、関連するEntityを発見できます。

## Vector Layerの構造

各Entity/Relationは以下の属性でベクトル空間にマッピングされます：

1. **embeddingId**: ベクトルDB内の一意キー
2. **embedHint**: 埋め込み計算のためのテキスト（英語推奨）
3. **llmLabel**: LLM用の説明文（多言語可）

ベクトル検索により、意味的に近いEntityを発見できます。

## クロスモーダルマッピング

### LLM（GPT / Claude / Gemini）

- **入力**: `Scene` + 関連 `Character` + 必要なら `Relation`
- **プロンプト生成**: `llmLabel` と `summary` をベースに小説本文・脚本・ト書きを生成
- **出力処理**: 生成されたテキストから新たな設定や関係を抽出し、Entity/Relationに再エンコード

### SDXL（画像生成）

- **入力**: `imagePrompt` + キャラの `visualProfile`
- **プロンプト生成**: 
  - `scene.imagePrompt` をベースに
  - 登場キャラの `imagePrompt` を組み合わせ
  - `shot` の `camera` / `lighting` 情報を追加

### Runway / Sora（動画生成）

- **入力**: `Scene` + `Shot` 連鎖
- **プロンプト生成**: 
  - 各 `Shot` の `videoPrompt` / `camera` / `action` を使用
  - 1カットごとに動画生成プロンプトを組む
  - カットをつなげる編集情報は別レイヤ（タイムライン）で管理

### 画像分析（GPT-4 Vision）

- **入力**: 生成された画像URL
- **出力**: 画像の内容を分析し、IRの属性を更新
  - `visualProfile` の更新
  - `imagePrompt` の改善提案
  - 新たな `Relation` の発見

## データベース統合

### PostgreSQLスキーマ

既存のPostgreSQLスキーマ（`documents`, `chunks`, `embeddings`）を拡張：

- `documents.jsonld_content`: 完全なJSON-LD IR（JSONB型）
- `documents.ir_type`: IRタイプ（'world', 'scene', 'character'等）
- `ir_entities`: JSON-LD Entityの正規化テーブル
- `ir_relations`: Relationの正規化テーブル
- `ir_embeddings`: Entity/RelationごとのembeddingIdマッピング

### グラフ探索

- `find_related_entities(entity_id)`: 指定Entityに関連するEntityを探索
- `query_graph(entity_id, relation_type)`: 特定の関係型で探索

### ベクトル検索

- `query_by_embedding(query_vector)`: ベクトル類似度検索
- `hybrid_search(query_vector, metadata_filter)`: ベクトル + メタデータフィルタリング

## ワークフロー例

### エンドツーエンドワークフロー

1. **ログライン作成** → IRの`Scene`/`Shot`定義
2. **IR作成** → JSON-LD Entity/Relationを定義
3. **Embedding生成** → `embedHint`/`llmLabel`からベクトル生成
4. **LLM生成** → Sceneから脚本・小説本文を生成
5. **IR更新** → 生成テキストから新情報を抽出してIR更新
6. **画像生成** → `imagePrompt`から画像生成
7. **画像分析** → GPT-4 Visionで画像分析
8. **IR更新** → 分析結果をIRに反映

## 実装上の注意点

1. **JSON-LD準拠**: RDF/JSON-LD標準に準拠し、既存ツールとの互換性を保つ
2. **型安全性**: TypeScript型定義により、型安全性を確保
3. **スケーラビリティ**: 大規模なグラフ構造にも対応可能な設計
4. **クロスモーダル**: テキスト/画像/動画の相互変換を可能にする
5. **wasmCloud対応**: WebAssemblyクラウド環境での運用を考慮

## 参考資料

- [JSON-LD 1.1 Specification](https://www.w3.org/TR/json-ld11/)
- [TypeDB Documentation](https://docs.vaticle.com/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Documentation](https://platform.openai.com/docs)
