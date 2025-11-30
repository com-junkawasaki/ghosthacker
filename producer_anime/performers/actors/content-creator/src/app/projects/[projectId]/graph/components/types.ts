/**
 * Story Element Graph Types
 * ストーリー要素グラフの型定義
 */

export type StoryElementNodeType =
  | 'logline'
  | 'story'
  | 'worldview'
  | 'background'
  | 'timeline'
  | 'beat'
  | 'character'
  | 'scene'
  | 'cut'
  | 'costume'
  | 'camera-angle'
  | 'event'
  | 'context'
  | 'process';

export type StoryElementEdgeType =
  | 'contains'
  | 'belongsTo'
  | 'appearsIn'
  | 'influences'
  | 'precedes'
  | 'causes'
  | 'conflictsWith'
  | 'relatesTo';

export interface GraphNodeData {
  label: string;
  nodeType?: StoryElementNodeType;
  properties: Record<string, any>;
  jsonld?: Record<string, any>;
  isContext?: boolean;
  contextData?: {
    version?: number;
    prefixes?: Record<string, string>;
  };
  contextId?: string; // 後方互換性のため残す
  contextIds?: string[]; // 複数のコンテクストレイヤーへの所属をサポート
  depth?: number;
  parent?: string;
  children?: string[];
}

export interface ContextLayer {
  contextNodeId: string;
  containedNodeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  visible?: boolean;
  order?: number;
  color?: string;
}

export interface NodeTypeMetadata {
  defaultContextLayers: string[];
  requiredContextLayers: string[];
  parentNodeTypes: StoryElementNodeType[];
  childNodeTypes: StoryElementNodeType[];
  metadata?: {
    label?: string;
    description?: string;
    [key: string]: any;
  };
}

export interface ContextLayerDependency {
  nodeType: StoryElementNodeType;
  metadata: NodeTypeMetadata;
}

export interface StoryElementProperties {
  // Character
  name?: string;
  role?: string;
  personality?: string;
  motivation?: string;
  conflict?: string;
  voice?: string;
  
  // Beat
  id?: string;
  purpose?: 'setup' | 'conflict' | 'climax';
  targetLength?: number;
  content?: string;
  
  // Worldview
  setting?: string;
  era?: string;
  rules?: string;
  atmosphere?: string;
  
  // Timeline
  startDate?: string;
  endDate?: string;
  events?: string[];
  
  // Scene
  location?: string;
  time?: string;
  participants?: string[];
  description?: string;
  
  // Event
  type?: string;
  eventDescription?: string;
  consequences?: string[];
  
  // Process
  generationType?: 'document' | 'image';
  llmProvider?: 'openai' | 'anthropic' | 'custom';
  modelId?: string;
  promptTemplate?: string;
  autoExecute?: boolean;
  inputNodes?: string[];
  outputFormat?: string;
  lastExecutionTime?: string;
  lastExecutionResult?: string;
  executionStatus?: 'idle' | 'running' | 'completed' | 'error';
  generatedContent?: string;
  
  // Logline
  coreConcept?: string;
  hook?: string;
  
  // Story
  structure?: string;
  theme?: string;
  genre?: string;
  
  // Cut
  shotType?: string;
  duration?: number;
  transition?: string;
  
  // Costume
  characterId?: string;
  season?: string;
  occasion?: string;
  
  // Camera Angle
  angle?: 'close-up' | 'medium' | 'wide' | 'extreme-wide' | 'bird-eye' | 'worm-eye';
  movement?: 'static' | 'pan' | 'tilt' | 'dolly' | 'track' | 'crane';
  focus?: string;
}

export interface ProcessNodeProperties {
  generationType: 'document' | 'image';
  llmProvider: 'openai' | 'anthropic' | 'custom';
  modelId: string;
  promptTemplate: string;
  autoExecute: boolean;
  inputNodes: string[];
  outputFormat: string;
  lastExecutionTime?: string;
  lastExecutionResult?: string;
  executionStatus?: 'idle' | 'running' | 'completed' | 'error';
  generatedContent?: string;
}

export const NODE_TYPE_COLORS: Record<StoryElementNodeType, string> = {
  logline: '#10b981', // emerald
  story: '#3b82f6', // blue
  worldview: '#6366f1', // indigo
  background: '#a855f7', // purple
  timeline: '#6b7280', // gray
  beat: '#f97316', // orange
  character: '#22c55e', // green
  scene: '#ec4899', // pink
  cut: '#f43f5e', // rose
  costume: '#8b5cf6', // violet
  'camera-angle': '#06b6d4', // cyan
  event: '#ef4444', // red
  context: '#f59e0b', // amber
  process: '#8b5cf6', // purple
};

export const EDGE_TYPE_COLORS: Record<StoryElementEdgeType, string> = {
  contains: '#3b82f6',
  belongsTo: '#8b5cf6',
  appearsIn: '#22c55e',
  influences: '#f59e0b',
  precedes: '#06b6d4',
  causes: '#ef4444',
  conflictsWith: '#dc2626',
  relatesTo: '#6b7280',
};

export const ELEMENT_TYPE_LABELS: Record<StoryElementNodeType, string> = {
  logline: 'ログライン',
  story: 'ストーリー',
  worldview: '世界観',
  background: '背景',
  timeline: '時間軸',
  beat: 'ビート',
  character: 'キャラクター',
  scene: 'シーン',
  cut: 'カット',
  costume: '服装',
  'camera-angle': 'カメラアングル',
  event: 'イベント',
  context: 'コンテキスト',
  process: 'プロセス',
};

