/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/extract-structured-context
 * 
 * 構造化コンテキスト抽出
 * 階層的ハイブリッドアプローチ（Node + Mark + Attribute）に基づいて
 * シーン、場所、人物、感情、文脈を統合的に抽出
 */

import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode, Mark as ProseMirrorMark } from '@tiptap/pm/model';
import type { ExtractedNode } from './contextExtractor';

/**
 * Mark情報
 */
export interface MarkInfo {
  type: string;
  attributes: Record<string, unknown>;
  position: { from: number; to: number };
}

/**
 * キャラクター情報（Node + Marks）
 */
export interface CharacterWithMarks {
  node: ExtractedNode;
  marks: MarkInfo[];
}

/**
 * 会話情報（テキスト + Marks）
 */
export interface DialogueWithContext {
  text: string;
  position: { from: number; to: number };
  marks: MarkInfo[];
  characterId?: string;
}

/**
 * 構造化コンテキスト
 */
export interface StructuredContext {
  scene: ExtractedNode | null;
  location: ExtractedNode | null;
  characters: CharacterWithMarks[];
  dialogue: DialogueWithContext[];
  emotions: MarkInfo[];
  contexts: MarkInfo[];
}

/**
 * Markタイプのマッピング
 */
const MARK_TYPE_MAP: Record<string, string> = {
  emotionMark: 'emotion',
  themeMark: 'theme',
  contextMark: 'context',
  notesMark: 'notes',
  relationshipMark: 'relationship',
  virtueMark: 'virtue',
  anchoredToMark: 'anchoredTo',
  emitsRepelsAvoidsMark: 'emitsRepelsAvoids',
  phaseMark: 'phase',
  roleMark: 'role',
  characterMark: 'character',
};

/**
 * テキストノードから適用されたMarksを抽出
 */
function extractMarksFromText(
  node: ProseMirrorNode,
  pos: number
): MarkInfo[] {
  if (!node.isText || node.marks.length === 0) {
    return [];
  }

  const marks: MarkInfo[] = [];

  node.marks.forEach((mark: ProseMirrorMark) => {
    const markType = MARK_TYPE_MAP[mark.type.name] || mark.type.name;
    
    marks.push({
      type: markType,
      attributes: mark.attrs as Record<string, unknown>,
      position: {
        from: pos,
        to: pos + node.nodeSize,
      },
    });
  });

  return marks;
}

/**
 * 親ノードを遡ってScene Nodeを検索
 */
function findParentScene(
  editor: Editor,
  position: number
): ExtractedNode | null {
  const { state } = editor;
  const resolved = state.doc.resolve(position);
  
  // 親ノードを遡ってScene Nodeを検索
  for (let depth = resolved.depth; depth > 0; depth--) {
    const node = resolved.node(depth);
    if (node.type.name === 'scene') {
      const attrs = node.attrs as Record<string, unknown>;
      const name = (attrs.name as string) || (attrs.sceneId as string) || 'Unknown';
      const nodePos = resolved.start(depth);
      
      return {
        type: 'scene',
        name,
        attributes: attrs,
        position: {
          from: nodePos,
          to: nodePos + node.nodeSize,
        },
      };
    }
  }

  // ドキュメント全体からScene Nodeを検索（フォールバック）
  let sceneNode: ExtractedNode | null = null;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'scene' && pos <= position) {
      const attrs = node.attrs as Record<string, unknown>;
      const name = (attrs.name as string) || (attrs.sceneId as string) || 'Unknown';
      
      // 最も近いScene Nodeを選択
      if (!sceneNode || pos > sceneNode.position.from) {
        sceneNode = {
          type: 'scene',
          name,
          attributes: attrs,
          position: {
            from: pos,
            to: pos + node.nodeSize,
          },
        };
      }
    }
  });

  return sceneNode;
}

/**
 * シーンノードから階層構造を抽出
 */
function extractSceneHierarchy(
  editor: Editor,
  sceneNode: ExtractedNode
): {
  location: ExtractedNode | null;
  characters: CharacterWithMarks[];
} {
  const { state } = editor;
  const { from, to } = sceneNode.position;
  
  let location: ExtractedNode | null = null;
  const characters: CharacterWithMarks[] = [];

  // シーン内のノードを走査
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    // Location Nodeを検出
    if (node.type.name === 'location' && !location) {
      const attrs = node.attrs as Record<string, unknown>;
      const name = (attrs.name as string) || (attrs.locationId as string) || 'Unknown';
      
      location = {
        type: 'location',
        name,
        attributes: attrs,
        position: {
          from: pos,
          to: pos + node.nodeSize,
        },
      };
    }

    // Character Nodeを検出
    if (node.type.name === 'character') {
      const attrs = node.attrs as Record<string, unknown>;
      const name = (attrs.name as string) || (attrs.characterId as string) || 'Unknown';
      
      const characterNode: ExtractedNode = {
        type: 'character',
        name,
        attributes: attrs,
        position: {
          from: pos,
          to: pos + node.nodeSize,
        },
      };

      // Character Node内のMarksを抽出
      const marks: MarkInfo[] = [];
      node.descendants((childNode, childPos) => {
        if (childNode.isText) {
          const childMarks = extractMarksFromText(childNode, pos + childPos);
          marks.push(...childMarks);
        }
      });

      characters.push({
        node: characterNode,
        marks,
      });
    }
  });

  return { location, characters };
}

/**
 * 会話テキストとそのコンテキスト（Marks）を抽出
 */
function extractDialogueWithContext(
  editor: Editor,
  position: { from: number; to: number }
): DialogueWithContext[] {
  const { state } = editor;
  const { from, to } = position;
  const dialogues: DialogueWithContext[] = [];

  // 選択範囲内のテキストノードを走査
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.isText) {
      const text = node.textContent.trim();
      if (text) {
        const marks = extractMarksFromText(node, pos);
        
        // CharacterMarkからcharacterIdを抽出
        let characterId: string | undefined;
        marks.forEach((mark) => {
          if (mark.type === 'character' && mark.attributes.characterId) {
            characterId = mark.attributes.characterId as string;
          }
        });

        const dialogue: DialogueWithContext = {
          text,
          position: {
            from: pos,
            to: pos + node.nodeSize,
          },
          marks,
        };
        if (characterId) {
          dialogue.characterId = characterId;
        }
        dialogues.push(dialogue);
      }
    }
  });

  return dialogues;
}

/**
 * 選択範囲から階層的コンテキストを抽出
 */
export function extractStructuredContext(
  editor: Editor,
  position: { from: number; to: number }
): StructuredContext {
  const { state } = editor;
  const { from, to } = position;

  // 1. Scene Nodeを検索（親ノードを遡る）
  const scene = findParentScene(editor, from);

  // 2. Location Nodeを検索
  let location: ExtractedNode | null = null;
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.type.name === 'location' && !location) {
      const attrs = node.attrs as Record<string, unknown>;
      const name = (attrs.name as string) || (attrs.locationId as string) || 'Unknown';
      
      location = {
        type: 'location',
        name,
        attributes: attrs,
        position: {
          from: pos,
          to: pos + node.nodeSize,
        },
      };
    }
  });

  // 3. Scene内の階層構造を抽出
  let sceneHierarchy: { location: ExtractedNode | null; characters: CharacterWithMarks[] } = {
    location: null,
    characters: [],
  };
  if (scene) {
    sceneHierarchy = extractSceneHierarchy(editor, scene);
    // Scene内のLocationを優先
    if (sceneHierarchy.location) {
      location = sceneHierarchy.location;
    }
  }

  // 4. Character NodeとMarksを抽出
  const characters: CharacterWithMarks[] = [...sceneHierarchy.characters];
  
  // 選択範囲内のCharacter Nodeも追加
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.type.name === 'character') {
      const attrs = node.attrs as Record<string, unknown>;
      const name = (attrs.name as string) || (attrs.characterId as string) || 'Unknown';
      
      const characterNode: ExtractedNode = {
        type: 'character',
        name,
        attributes: attrs,
        position: {
          from: pos,
          to: pos + node.nodeSize,
        },
      };

      // Character Node内のMarksを抽出
      const marks: MarkInfo[] = [];
      node.descendants((childNode, childPos) => {
        if (childNode.isText) {
          const childMarks = extractMarksFromText(childNode, pos + childPos);
          marks.push(...childMarks);
        }
      });

      // 重複チェック
      const charId = attrs.characterId as string;
      const exists = characters.some(
        (char) => (char.node.attributes.characterId as string) === charId
      );
      
      if (!exists) {
        characters.push({
          node: characterNode,
          marks,
        });
      }
    }
  });

  // 5. Character Markを検出（インライン）
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.isText) {
      node.marks.forEach((mark: ProseMirrorMark) => {
        if (mark.type.name === 'characterMark') {
          const attrs = mark.attrs as Record<string, unknown>;
          const characterId = attrs.characterId as string;
          
          if (characterId) {
            // 既存のCharacter Nodeに追加するか、新規作成
            const existingChar = characters.find(
              (char) => (char.node.attributes.characterId as string) === characterId
            );
            
            if (existingChar) {
              // 既存のCharacterにMarkを追加
              existingChar.marks.push({
                type: 'character',
                attributes: attrs,
                position: {
                  from: pos,
                  to: pos + node.nodeSize,
                },
              });
            } else {
              // 新規Characterとして追加
              characters.push({
                node: {
                  type: 'character',
                  name: (attrs.name as string) || characterId,
                  attributes: attrs,
                  position: {
                    from: pos,
                    to: pos + node.nodeSize,
                  },
                },
                marks: [{
                  type: 'character',
                  attributes: attrs,
                  position: {
                    from: pos,
                    to: pos + node.nodeSize,
                  },
                }],
              });
            }
          }
        }
      });
    }
  });

  // 6. 会話テキストとそのコンテキストを抽出
  const dialogue = extractDialogueWithContext(editor, { from, to });

  // 7. Emotion Markを抽出
  const emotions: MarkInfo[] = [];
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.isText) {
      node.marks.forEach((mark: ProseMirrorMark) => {
        if (mark.type.name === 'emotionMark') {
          emotions.push({
            type: 'emotion',
            attributes: mark.attrs as Record<string, unknown>,
            position: {
              from: pos,
              to: pos + node.nodeSize,
            },
          });
        }
      });
    }
  });

  // 8. Context Markを抽出
  const contexts: MarkInfo[] = [];
  state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.isText) {
      node.marks.forEach((mark: ProseMirrorMark) => {
        if (mark.type.name === 'contextMark') {
          contexts.push({
            type: 'context',
            attributes: mark.attrs as Record<string, unknown>,
            position: {
              from: pos,
              to: pos + node.nodeSize,
            },
          });
        }
      });
    }
  });

  return {
    scene,
    location,
    characters,
    dialogue,
    emotions,
    contexts,
  };
}

/**
 * カーソル位置周辺の構造化コンテキストを抽出
 */
export function extractStructuredContextAroundCursor(
  editor: Editor,
  range: number = 200
): StructuredContext {
  const { state } = editor;
  const { selection } = state;
  const { from } = selection;

  const contextFrom = Math.max(0, from - range);
  const contextTo = Math.min(state.doc.content.size, from + range);

  return extractStructuredContext(editor, {
    from: contextFrom,
    to: contextTo,
  });
}

