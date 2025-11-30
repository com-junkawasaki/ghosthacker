/**
 * Story Element Graph Types
 * ストーリー要素グラフの型定義
 */

export type StoryElementNodeType =
  | 'worldview'
  | 'background'
  | 'timeline'
  | 'beat'
  | 'character'
  | 'scene'
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
  description?: string;
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
  worldview: '#3b82f6', // blue
  background: '#a855f7', // purple
  timeline: '#6b7280', // gray
  beat: '#f97316', // orange
  character: '#22c55e', // green
  scene: '#ec4899', // pink
  event: '#ef4444', // red
  context: '#f59e0b', // amber (existing)
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
  worldview: '世界観',
  background: '背景',
  timeline: '時間軸',
  beat: 'ビート',
  character: 'キャラクター',
  scene: 'シーン',
  event: 'イベント',
  context: 'コンテキスト',
  process: 'プロセス',
};

