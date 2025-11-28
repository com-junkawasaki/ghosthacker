/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/jsonld-types
 * 
 * JSON-LDノードとマスクタイプの型定義
 * episode_bible.jsonldとghost-hacker.jsonldの構造に基づく
 */

// ============================================================================
// ノードタイプ定義（エディタに挿入可能な実体）
// ============================================================================

export interface CharacterNode {
  '@id'?: string;
  '@type': 'Person' | 'gh:Person';
  characterId: string;
  name: string;
  alternateName?: string;
  callsign?: string;
  description?: string;
  age?: number;
  occupation?: string | string[];
  ghost?: { '@id': string };
  worksFor?: { '@id': string };
  parent?: { '@id': string };
  spouse?: { '@id': string };
  sibling?: { '@id': string };
  colleague?: { '@id': string };
  knows?: Array<{ '@id': string }>;
  role?: string;
  virtue?: string;
  anchoredTo?: { '@id': string };
  emits?: { '@id': string };
  repels?: { '@id': string };
  avoids?: { '@id': string };
  persona?: string;
  affiliation?: { '@id': string };
  memberOf?: { '@id': string };
  gender?: string;
  nationality?: string;
  imageBase64?: string;
}

export interface GhostNode {
  '@id'?: string;
  '@type': 'gh:Ghost' | ['Person', 'gh:Ghost'];
  ghostId: string;
  name: string;
  description?: string;
  ghostType?: 'Human-derived' | 'Artificial Intelligence' | 'Alien' | 'Philosophical' | 'Cultural';
  master?: { '@id': string };
  createdBy?: { '@id': string };
}

export interface LocationNode {
  '@id'?: string;
  '@type': 'Place';
  locationId: string;
  name: string;
  description?: string;
  year?: number;
  hazardNote?: string;
  operationalNote?: string;
  securityNote?: string;
  alternateName?: string;
}

export interface OrganizationNode {
  '@id'?: string;
  '@type': 'Organization';
  organizationId: string;
  name: string;
  description?: string;
  founder?: { '@id': string };
  companyType?: string;
  infraNote?: string;
  operationalNote?: string;
  securityNote?: string;
  items?: Array<{ '@id': string }>;
  sponsor?: Array<{ '@id': string }>;
}

export interface CompanyNode extends OrganizationNode {
  '@type': 'Organization';
  companyId: string;
}

export interface TechnologyNode {
  '@id'?: string;
  '@type': 'Intangible';
  technologyId: string;
  name: string;
  description?: string;
  certification?: { '@id': string };
  infraNote?: string;
  operationalNote?: string;
  securityNote?: string;
  items?: Array<{ '@id': string }>;
}

export interface EpisodeNode {
  '@id'?: string;
  '@type': 'Episode';
  episodeId: string;
  episodeNumber: number;
  season: { '@id': string };
  name: string;
  logline?: string;
  hasArc?: Array<{ '@id': string }>;
  hasScene?: Array<{ '@id': string }>;
  hasCharacter?: Array<{ '@id': string }>;
  motifRefs?: Array<{ '@id': string }>;
  antagonist?: Array<{ '@id': string }>;
  source?: { '@id': string };
  flashbackOf?: { '@id': string };
  influences?: Array<{ '@id': string }>;
  precedes?: { '@id': string };
}

export interface SceneNode {
  '@id'?: string;
  '@type': 'Scene';
  sceneId: string;
  name: string;
  sameAs?: string;
  description?: string;
}

export interface POVNode {
  '@id'?: string;
  '@type': 'POV';
  povId: string;
  name: string;
  description?: string;
  characterId?: { '@id': string };
  perspectiveType?: 'first-person' | 'third-person-limited' | 'third-person-omniscient' | 'second-person';
}

export interface BeatNode {
  '@id'?: string;
  '@type': 'Beat';
  beatId: string;
  name: string;
  description?: string;
  position?: number;
  sceneId?: { '@id': string };
}

export interface ArcNode {
  '@id'?: string;
  '@type': 'Arc';
  arcId: string;
  name: string;
  spansSeasons?: Array<{ '@id': string }>;
  phase?: string;
  description?: string;
}

export interface MotifNode {
  '@id'?: string;
  '@type': 'Motif';
  motifId: string;
  name: string;
  theme?: string;
  source?: { '@id': string };
  description?: string;
}

export interface SeasonNode {
  '@id'?: string;
  '@type': 'Season';
  seasonId: string;
  name: string;
  theme?: string;
  featuredThemes?: string[];
  source?: { '@id': string };
}

export interface TimelineNode {
  '@id'?: string;
  '@type': 'Timeline';
  timelineId: string;
  name: string;
  description?: string;
  influences?: Array<{ '@id': string }>;
  source?: { '@id': string };
}

export interface SourceRefNode {
  '@id'?: string;
  '@type': 'SourceRef';
  sourceRefId: string;
  path: string;
  lang: string;
  selectionHint?: string;
}

export interface EventNode {
  '@id'?: string;
  '@type': 'Event';
  eventId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  temporalCoverage?: string;
  sameAs?: Array<{ '@id': string }>;
}

export interface OccupationNode {
  '@id'?: string;
  '@type': 'Intangible';
  occupationId: string;
  name: string;
  description?: string;
}

export interface SettingNode {
  '@id'?: string;
  '@type': 'Intangible';
  settingId: string;
  name: string;
  description?: string;
  ghostType?: string | string[];
}

export interface ChapterLinkNode {
  '@id'?: string;
  '@type': 'Chapter';
  chapterId: string;
  title: string;
  order: number;
  epubId: string;
}

// ============================================================================
// 感情分析型定義
// ============================================================================

export interface EmotionProfile {
  emotionVector: EmotionScore[];
  createdAt: string;
  language: string;
}

export interface EmotionScore {
  emotion: string; // joy, sadness, fear, anger, surprise, trust, anticipation, disgust, relief, hope
  score: number; // 0-1
}

// ============================================================================
// マスクタイプ定義（視覚的に隠す/表示するメタデータ）
// ============================================================================

export interface EmotionMask {
  type: 'emotion';
  emotionalPlan?: {
    '@type': 'gh:EmotionalPlan';
    beats?: Array<{
      '@type': 'gh:EmotionalBeat';
      position: number;
      targetEmotions: {
        curiosity?: number;
        surprise?: number;
        anticipation?: number;
        sadness?: number;
        trust?: number;
        relief?: number;
        hope?: number;
        [key: string]: number | undefined;
      };
    }>;
  };
  targetEmotions?: {
    curiosity?: number;
    surprise?: number;
    anticipation?: number;
    sadness?: number;
    trust?: number;
    relief?: number;
    hope?: number;
    [key: string]: number | undefined;
  };
}

export interface ThemeMask {
  type: 'theme';
  theme?: string;
  featuredThemes?: string[];
}

export interface ContextMask {
  type: 'context';
  context?: {
    sessionBookedBy?: { '@id': string };
    promptingStyle?: string;
    disclosurePolicy?: string;
    familyContrast?: Array<{
      '@id': string;
      familySupport?: boolean;
      familyIssue?: string;
    }>;
  };
}

export interface NotesMask {
  type: 'notes';
  infraNote?: string;
  operationalNote?: string;
  securityNote?: string;
  hazardNote?: string;
}

export interface RelationshipMask {
  type: 'relationship';
  knows?: Array<{ '@id': string }>;
  worksFor?: { '@id': string };
  parent?: { '@id': string };
  spouse?: { '@id': string };
  sibling?: { '@id': string };
  colleague?: { '@id': string };
  relatesTo?: { '@id': string };
  relationshipType?: string;
}

export interface VirtueMask {
  type: 'virtue';
  virtue?: string;
}

export interface AnchoredToMask {
  type: 'anchoredTo';
  anchoredTo?: { '@id': string };
}

export interface EmitsRepelsAvoidsMask {
  type: 'emitsRepelsAvoids';
  emits?: { '@id': string };
  repels?: { '@id': string };
  avoids?: { '@id': string };
}

export interface PhaseMask {
  type: 'phase';
  phase?: string;
}

export interface RoleMask {
  type: 'role';
  role?: string;
}

// ============================================================================
// ユニオン型
// ============================================================================

export type JsonLdNode =
  | CharacterNode
  | GhostNode
  | LocationNode
  | OrganizationNode
  | CompanyNode
  | TechnologyNode
  | EpisodeNode
  | SceneNode
  | POVNode
  | BeatNode
  | ArcNode
  | MotifNode
  | SeasonNode
  | TimelineNode
  | SourceRefNode
  | EventNode
  | OccupationNode
  | SettingNode
  | ChapterLinkNode;

export type MarkType =
  | EmotionMask
  | ThemeMask
  | ContextMask
  | NotesMask
  | RelationshipMask
  | VirtueMask
  | AnchoredToMask
  | EmitsRepelsAvoidsMask
  | PhaseMask
  | RoleMask;

// ============================================================================
// Tiptapノード属性型
// ============================================================================

export interface TiptapNodeAttributes {
  nodeId: string;
  nodeType: string;
  name: string;
  [key: string]: unknown;
}

export interface TiptapMaskAttributes {
  emotionMask?: boolean;
  themeMask?: boolean;
  contextMask?: boolean;
  notesMask?: boolean;
  relationshipMask?: boolean;
  virtueMask?: boolean;
  anchoredToMask?: boolean;
  emitsRepelsAvoidsMask?: boolean;
  phaseMask?: boolean;
  roleMask?: boolean;
}

// TiptapMarkAttributes is an alias for TiptapMaskAttributes for backward compatibility
export interface TiptapMarkAttributes extends TiptapMaskAttributes {}

