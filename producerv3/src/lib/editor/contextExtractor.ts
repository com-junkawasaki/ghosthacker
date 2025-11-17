/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/extract-editor-context
 * 
 * エディターからコンテキスト情報を抽出するユーティリティ
 * 選択されたノード、mask範囲のノード、mask情報を取得
 */

import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { MaskType } from '@/types/jsonld';
import { extractStructuredContext, extractStructuredContextAroundCursor } from './structuredContextExtractor';

/**
 * ノードタイプの定義
 */
export type NodeType =
  | 'character'
  | 'ghost'
  | 'location'
  | 'organization'
  | 'company'
  | 'technology'
  | 'episode'
  | 'scene'
  | 'arc'
  | 'motif'
  | 'season'
  | 'timeline'
  | 'sourceRef'
  | 'event'
  | 'occupation'
  | 'setting';

/**
 * 抽出されたノード情報
 */
export interface ExtractedNode {
  type: NodeType;
  name: string;
  attributes: Record<string, unknown>;
  position: { from: number; to: number };
}

/**
 * Mask情報
 */
export interface MaskInfo {
  type: MaskType['type'];
  enabled: boolean;
  attributes?: Record<string, unknown>;
}

/**
 * エディターコンテキスト
 */
export interface EditorContext {
  selectedNodes: ExtractedNode[];
  maskedNodes: ExtractedNode[];
  masks: MaskInfo[];
  selectedText: string;
  structuredContext?: import('./structuredContextExtractor').StructuredContext;
}

/**
 * ノードタイプのマッピング
 */
const NODE_TYPE_MAP: Record<string, NodeType> = {
  character: 'character',
  ghost: 'ghost',
  location: 'location',
  organization: 'organization',
  company: 'company',
  technology: 'technology',
  episode: 'episode',
  scene: 'scene',
  arc: 'arc',
  motif: 'motif',
  season: 'season',
  timeline: 'timeline',
  sourceRef: 'sourceRef',
  event: 'event',
  occupation: 'occupation',
  setting: 'setting',
};

/**
 * Mask属性のマッピング
 */
const MASK_ATTRIBUTE_MAP: Record<string, MaskType['type']> = {
  emotionMask: 'emotion',
  themeMask: 'theme',
  contextMask: 'context',
  notesMask: 'notes',
  relationshipMask: 'relationship',
  virtueMask: 'virtue',
  anchoredToMask: 'anchoredTo',
  emitsRepelsAvoidsMask: 'emitsRepelsAvoids',
  phaseMask: 'phase',
  roleMask: 'role',
};

/**
 * ノードから情報を抽出
 */
function extractNodeInfo(node: ProseMirrorNode, pos: number): ExtractedNode | null {
  const nodeType = node.type.name as NodeType;
  
  if (!NODE_TYPE_MAP[nodeType]) {
    return null;
  }

  const attrs = node.attrs as Record<string, unknown>;
  const name = (attrs.name as string) || (attrs.characterId as string) || (attrs.ghostId as string) || (attrs.locationId as string) || 'Unknown';

  return {
    type: nodeType,
    name,
    attributes: attrs,
    position: {
      from: pos,
      to: pos + node.nodeSize,
    },
  };
}

/**
 * ノードにmaskが適用されているかチェック
 */
function hasMask(node: ProseMirrorNode): boolean {
  const attrs = node.attrs as Record<string, unknown>;
  return Object.keys(MASK_ATTRIBUTE_MAP).some((maskAttr) => attrs[maskAttr] === true);
}

/**
 * ノードからmask情報を抽出
 */
function extractMasks(node: ProseMirrorNode): MaskInfo[] {
  const attrs = node.attrs as Record<string, unknown>;
  const masks: MaskInfo[] = [];

  Object.entries(MASK_ATTRIBUTE_MAP).forEach(([attrName, maskType]) => {
    if (attrs[attrName] === true) {
      masks.push({
        type: maskType,
        enabled: true,
        attributes: attrs,
      });
    }
  });

  return masks;
}

/**
 * エディターからコンテキスト情報を抽出
 */
export function extractEditorContext(editor: Editor, includeStructuredContext: boolean = true): EditorContext {
  const { state } = editor;
  const { selection } = state;
  const { from, to } = selection;

  const selectedNodes: ExtractedNode[] = [];
  const maskedNodes: ExtractedNode[] = [];
  const masks: MaskInfo[] = [];
  const selectedText: string[] = [];

  // 選択範囲内のノードを走査
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    // テキストノードの場合はテキストを取得
    if (node.isText) {
      selectedText.push(node.textContent);
    }

    // JSON-LDノードを抽出
    const nodeInfo = extractNodeInfo(node, pos);
    if (nodeInfo) {
      selectedNodes.push(nodeInfo);

      // maskが適用されているかチェック
      if (hasMask(node)) {
        maskedNodes.push(nodeInfo);
        const nodeMasks = extractMasks(node);
        masks.push(...nodeMasks);
      }
    }

    // インラインノードの場合もチェック
    if (node.isInline && node.type.name !== 'text') {
      const inlineNodeInfo = extractNodeInfo(node, pos);
      if (inlineNodeInfo) {
        selectedNodes.push(inlineNodeInfo);

        if (hasMask(node)) {
          maskedNodes.push(inlineNodeInfo);
          const nodeMasks = extractMasks(node);
          masks.push(...nodeMasks);
        }
      }
    }
  });

  // 選択範囲のテキストを取得（ノード間のテキストも含む）
  const fullText = state.doc.textBetween(from, to);

  const context: EditorContext = {
    selectedNodes,
    maskedNodes,
    masks: Array.from(
      new Map(masks.map((mask) => [mask.type, mask])).values()
    ), // 重複を除去
    selectedText: fullText || selectedText.join(' '),
  };

  // 構造化コンテキストを追加（オプション）
  if (includeStructuredContext) {
    context.structuredContext = extractStructuredContext(editor, { from, to });
  }

  return context;
}

/**
 * 選択範囲が空の場合、カーソル位置周辺のノードを取得
 */
export function extractContextAroundCursor(editor: Editor, range: number = 100, includeStructuredContext: boolean = true): EditorContext {
  const { state } = editor;
  const { selection } = state;
  const { from } = selection;

  // カーソル位置周辺の範囲を設定
  const contextFrom = Math.max(0, from - range);
  const contextTo = Math.min(state.doc.content.size, from + range);

  const selectedNodes: ExtractedNode[] = [];
  const maskedNodes: ExtractedNode[] = [];
  const masks: MaskInfo[] = [];

  // 周辺範囲内のノードを走査
  state.doc.nodesBetween(contextFrom, contextTo, (node: ProseMirrorNode, pos: number) => {
    const nodeInfo = extractNodeInfo(node, pos);
    if (nodeInfo) {
      selectedNodes.push(nodeInfo);

      if (hasMask(node)) {
        maskedNodes.push(nodeInfo);
        const nodeMasks = extractMasks(node);
        masks.push(...nodeMasks);
      }
    }

    if (node.isInline && node.type.name !== 'text') {
      const inlineNodeInfo = extractNodeInfo(node, pos);
      if (inlineNodeInfo) {
        selectedNodes.push(inlineNodeInfo);

        if (hasMask(node)) {
          maskedNodes.push(inlineNodeInfo);
          const nodeMasks = extractMasks(node);
          masks.push(...nodeMasks);
        }
      }
    }
  });

  const text = state.doc.textBetween(contextFrom, contextTo);

  const context: EditorContext = {
    selectedNodes,
    maskedNodes,
    masks: Array.from(new Map(masks.map((mask) => [mask.type, mask])).values()),
    selectedText: text,
  };

  // 構造化コンテキストを追加（オプション）
  if (includeStructuredContext) {
    context.structuredContext = extractStructuredContextAroundCursor(editor, range);
  }

  return context;
}

/**
 * シーン内のキャラクターを抽出
 */
export function extractSceneCharacters(editor: Editor, sceneId: string): ExtractedNode[] {
  const { state } = editor;
  const doc = state.doc;
  const characters: ExtractedNode[] = [];
  let inScene = false;
  let sceneStartPos = 0;

  // Find scene node
  doc.descendants((node, pos) => {
    if (node.type.name === 'scene') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.sceneId === sceneId) {
        inScene = true;
        sceneStartPos = pos;
      } else if (inScene) {
        // End of scene
        inScene = false;
      }
    }

    // Extract characters within scene
    if (inScene && node.type.name === 'character') {
      const nodeInfo = extractNodeInfo(node, pos);
      if (nodeInfo) {
        characters.push(nodeInfo);
      }
    }
  });

  return characters;
}

/**
 * キャラクターの発話を抽出
 */
export function extractCharacterDialogue(editor: Editor, characterId: string): string[] {
  const { state } = editor;
  const doc = state.doc;
  const dialogue: string[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name === 'character') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.characterId === characterId) {
        // Extract text content from character node
        node.descendants((childNode) => {
          if (childNode.isText) {
            const text = childNode.textContent.trim();
            if (text) {
              dialogue.push(text);
            }
          }
        });
      }
    }
  });

  return dialogue;
}

/**
 * シーンにいるキャラクターのみをフィルタリング
 */
export function filterContextByScenePresence(
  editor: Editor,
  characters: ExtractedNode[],
  sceneId: string
): ExtractedNode[] {
  const sceneCharacters = extractSceneCharacters(editor, sceneId);
  const sceneCharacterIds = new Set(
    sceneCharacters.map((char) => {
      const attrs = char.attributes as Record<string, unknown>;
      return (attrs.characterId as string) || (attrs.name as string);
    })
  );

  return characters.filter((char) => {
    const attrs = char.attributes as Record<string, unknown>;
    const charId = (attrs.characterId as string) || (attrs.name as string);
    return sceneCharacterIds.has(charId);
  });
}

/**
 * POVノードからナレーター情報を抽出
 */
export function extractNarratorFromPOV(editor: Editor, povId: string): ExtractedNode | null {
  const { state } = editor;
  const doc = state.doc;
  let povNode: ExtractedNode | null = null;

  doc.descendants((node, pos) => {
    if (node.type.name === 'pov') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.povId === povId) {
        povNode = extractNodeInfo(node, pos);
      }
    }
  });

  return povNode;
}

