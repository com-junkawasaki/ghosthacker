/**
 * TypeScript型定義: 統合IR（Symbolic + Graph + Vector）
 * 
 * JSON-LDベースの統合IRの型定義
 * Symbolic Layer, Graph Layer, Vector Layerを統合
 */

// ============================================
// 基本型定義
// ============================================

/**
 * 共通メタ属性
 */
export interface MetaAttributes {
  llmLabel?: string;      // LLM用の自然文説明（日本語可）
  embedHint?: string;     // 埋め込み計算用の英語中心テキスト
  imagePrompt?: string;   // SDXL/画像生成用プロンプト
  videoPrompt?: string;   // Runway/Sora用動画生成プロンプト
  embeddingId?: string;   // ベクトルDBのキー
}

/**
 * Entity共通構造
 */
export interface Entity extends MetaAttributes {
  "@id": string;          // グローバルID（"char:ghost-hacker"など）
  "@type": string;        // "Character" / "Scene" / ...
  name?: string;
}

/**
 * 視覚プロファイル
 */
export interface VisualProfile {
  age?: number;
  gender?: string;
  appearance?: string[];  // ["hoodie", "tired-eyes", ...]
  colorTheme?: string;    // "blue-cyan"
}

// ============================================
// Entity型定義
// ============================================

/**
 * World: 世界観・設定
 */
export interface World extends Entity {
  "@type": "World";
  description?: string;
}

/**
 * Character: キャラクター
 */
export interface Character extends Entity {
  "@type": "Character";
  role: string;           // "protagonist", "antagonist", "supporting" etc.
  traits: string[];       // ["insomniac", "ethical", ...]
  visualProfile?: VisualProfile;
}

/**
 * Location: 場所・ロケーション
 */
export interface Location extends Entity {
  "@type": "Location";
  world?: string;         // World @id
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

/**
 * Organization: 組織・グループ
 */
export interface Organization extends Entity {
  "@type": "Organization";
  world?: string;         // World @id
  members?: string[];     // Character @id 配列
}

/**
 * Object: 物体・アイテム
 */
export interface Object extends Entity {
  "@type": "Object";
  objectType?: string;     // "weapon", "device", "document" etc.
}

/**
 * Scene: シーン（テキスト/脚本単位）
 */
export interface Scene extends Entity {
  "@type": "Scene";
  title: string;
  summary: string;
  world: string;          // World @id
  location?: string;      // Location @id
  time?: string;          // ISO8601 / 相対表現でも可
  beats?: string[];       // ["anomaly detected", ...]
  characters?: string[];  // Character @id 配列
}

/**
 * Shot: ショット（動画カット単位）
 */
export interface Shot extends Entity {
  "@type": "Shot";
  scene: string;          // Scene @id
  order: number;          // シーン内の順序
  durationSec?: number;
  camera?: {
    type?: string;        // "static", "dolly-in", "pan-right"
    angle?: string;       // "low", "high", "eye-level"
    distance?: string;    // "close-up", "medium", "wide"
  };
  action: string;         // "hero typing fast", ...
  lighting?: string;      // "neon-blue", ...
}

/**
 * Concept: 概念・テーマ
 */
export interface Concept extends Entity {
  "@type": "Concept";
  conceptType?: string;   // "theme", "motif", "symbol" etc.
}

// ============================================
// Relation型定義
// ============================================

/**
 * Relation: 関係
 */
export interface Relation extends Entity {
  "@type": "Relation";
  relationType: RelationType;
  from: string;           // @id
  to: string;             // @id
  scene?: string;         // 関係が現れる Scene @id
  strength?: number;       // 0〜1 の関係強度など
}

/**
 * Relation型の列挙
 */
export type RelationType =
  | "AppearsIn"      // 登場関係（Character → Scene）
  | "WorksFor"       // 所属関係（Character → Organization）
  | "Opposes"        // 対立関係（Character → Character）
  | "Mentors"        // 指導関係（Character → Character）
  | "Controls"       // 支配関係（Character → Object/Organization）
  | "LocatedIn"      // 位置関係（Entity → Location）
  | "Causes"         // 因果関係（Event → Event）
  | "Reveals"        // 開示関係（Scene → Concept）
  | "Contains"       // 包含関係（Scene → Shot, Document → Chunk）
  | "References"     // 参照関係（任意のEntity間）
  | "Owns"           // 所有関係
  | "Uses"           // 使用関係
  | "Creates"        // 作成関係
  | "Destroys"       // 破壊関係
  | "Transforms";    // 変換関係

// ============================================
// ユニオン型
// ============================================

/**
 * すべてのEntity型のユニオン
 */
export type AnyEntity =
  | World
  | Character
  | Location
  | Organization
  | Object
  | Scene
  | Shot
  | Concept
  | Relation;

// ============================================
// JSON-LD文書構造
// ============================================

/**
 * JSON-LD文書（複数のEntity/Relationを含む）
 */
export interface IRDocument {
  "@context": Record<string, any>;
  "@graph"?: AnyEntity[];  // 複数のEntity/Relationを含む場合
  [key: string]: any;      // 単一Entityの場合も許可
}

// ============================================
// ヘルパー型
// ============================================

/**
 * Entity型から@typeを抽出
 */
export type EntityType<T extends AnyEntity> = T["@type"];

/**
 * 特定の型のEntityを抽出
 */
export type EntityOfType<T extends EntityType<AnyEntity>> = Extract<
  AnyEntity,
  { "@type": T }
>;

/**
 * グラフ探索用の型
 */
export interface GraphNode {
  id: string;
  type: string;
  entity: AnyEntity;
  relations: {
    type: RelationType;
    target: string;
    strength?: number;
  }[];
}
