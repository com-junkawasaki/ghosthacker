/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/build-multi-agent-context
 * 
 * Multi-Agent Context Builder
 * Builds context for each agent (character, narrator) from JSONLD nodes
 */
import type { Editor } from '@tiptap/react';
import type { ExtractedNode } from '@/lib/editor/contextExtractor';
import { extractStructuredContext } from '@/lib/editor/structuredContextExtractor';
import type { StructuredContext } from '@/lib/editor/structuredContextExtractor';
import type { CharacterNode, SceneNode, POVNode, EmotionMask } from '@/types/jsonld';

/**
 * Character context information
 */
export interface CharacterContext {
  characterId: string;
  name: string;
  attributes: Record<string, unknown>;
  relationships: Array<{ type: string; targetId: string }>;
  dialogue: string[];
  scenePresence: boolean;
}

/**
 * Scene context information
 */
export interface SceneContext {
  sceneId: string;
  name: string;
  characters: CharacterContext[];
  location?: { id: string; name: string };
  emotionState?: Record<string, number>;
}

/**
 * Narrator context information
 */
export interface NarratorContext {
  povId: string;
  characterId?: string;
  perspectiveType?: 'first-person' | 'third-person-limited' | 'third-person-omniscient' | 'second-person';
  name: string;
}

/**
 * Multi-agent context
 */
export interface MultiAgentContext {
  characters: CharacterContext[];
  narrator?: NarratorContext;
  scene?: SceneContext;
  emotionArc?: Array<{ position: number; targetEmotions: Record<string, number> }>;
  structuredContext?: StructuredContext;
}

/**
 * Build character context from editor nodes
 */
export function buildCharacterContext(
  editor: Editor,
  characterId: string,
  sceneId?: string
): CharacterContext | null {
  const { state } = editor;
  const doc = state.doc;
  
  let characterNode: ExtractedNode | null = null;
  const dialogue: string[] = [];
  let scenePresence = false;
  
  // Find character node and extract dialogue
  doc.descendants((node, pos) => {
    if (node.type.name === 'character') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.characterId === characterId) {
        characterNode = {
          type: 'character',
          name: (attrs.name as string) || 'Unknown',
          attributes: attrs,
          position: { from: pos, to: pos + node.nodeSize },
        };
        
        // Extract dialogue from character node content
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
    
    // Check if character is in scene
    if (sceneId && node.type.name === 'scene') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.sceneId === sceneId) {
        // Check if character node is within this scene
        node.descendants((childNode, childPos) => {
          if (childNode.type.name === 'character') {
            const childAttrs = childNode.attrs as Record<string, unknown>;
            if (childAttrs.characterId === characterId) {
              scenePresence = true;
            }
          }
        });
      }
    }
  });
  
  if (!characterNode) {
    return null;
  }
  
  // Extract relationships from attributes
  const relationships: Array<{ type: string; targetId: string }> = [];
  const attrs = characterNode.attributes;
  
  const relationshipFields = ['worksFor', 'parent', 'spouse', 'sibling', 'colleague', 'knows'];
  relationshipFields.forEach((field) => {
    const value = attrs[field];
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null && '@id' in item) {
            relationships.push({
              type: field,
              targetId: (item as { '@id': string })['@id'],
            });
          }
        });
      } else if (typeof value === 'object' && value !== null && '@id' in value) {
        relationships.push({
          type: field,
          targetId: (value as { '@id': string })['@id'],
        });
      }
    }
  });
  
  return {
    characterId,
    name: characterNode.name,
    attributes: characterNode.attributes,
    relationships,
    dialogue,
    scenePresence: sceneId ? scenePresence : true, // If no scene specified, assume present
  };
}

/**
 * Build scene context from editor nodes
 */
export function buildSceneContext(editor: Editor, sceneId: string): SceneContext | null {
  const { state } = editor;
  const doc = state.doc;
  
  let sceneNode: ExtractedNode | null = null;
  const characters: CharacterContext[] = [];
  let location: { id: string; name: string } | undefined;
  
  // Find scene node
  doc.descendants((node, pos) => {
    if (node.type.name === 'scene') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.sceneId === sceneId) {
        sceneNode = {
          type: 'scene',
          name: (attrs.name as string) || 'Unknown',
          attributes: attrs,
          position: { from: pos, to: pos + node.nodeSize },
        };
        
        // Extract characters in scene
        node.descendants((childNode, childPos) => {
          if (childNode.type.name === 'character') {
            const childAttrs = childNode.attrs as Record<string, unknown>;
            const characterId = childAttrs.characterId as string;
            if (characterId) {
              const charContext = buildCharacterContext(editor, characterId, sceneId);
              if (charContext) {
                characters.push(charContext);
              }
            }
          }
          
          // Extract location
          if (childNode.type.name === 'location') {
            const locationAttrs = childNode.attrs as Record<string, unknown>;
            location = {
              id: (locationAttrs.locationId as string) || '',
              name: (locationAttrs.name as string) || 'Unknown',
            };
          }
        });
      }
    }
  });
  
  if (!sceneNode) {
    return null;
  }
  
  const sceneContext: SceneContext = {
    sceneId,
    name: sceneNode.name,
    characters,
  };
  if (location) {
    sceneContext.location = location;
  }
  return sceneContext;
}

/**
 * Build narrator context from POV node
 */
export function buildNarratorContext(editor: Editor, povId: string): NarratorContext | null {
  const { state } = editor;
  const doc = state.doc;
  
  let povNode: ExtractedNode | null = null;
  
  // Find POV node
  doc.descendants((node, pos) => {
    if (node.type.name === 'pov') {
      const attrs = node.attrs as Record<string, unknown>;
      if (attrs.povId === povId) {
        // POV node is not in NodeType, so we create a custom structure
        // We'll use a workaround by creating a node-like structure
        const name = (attrs.name as string) || 'Unknown';
        povNode = {
          type: 'character' as NodeType, // Use character as fallback type
          name,
          attributes: attrs,
          position: { from: pos, to: pos + node.nodeSize },
        };
      }
    }
  });
  
  if (!povNode) {
    return null;
  }
  
  const attrs = povNode.attributes;
  const characterId = attrs.characterId
    ? (typeof attrs.characterId === 'object' && '@id' in attrs.characterId
        ? (attrs.characterId as { '@id': string })['@id']
        : (attrs.characterId as string))
    : undefined;
  
  const narratorContext: NarratorContext = {
    povId,
    name: povNode.name,
  };
  if (characterId) {
    narratorContext.characterId = characterId;
  }
  if (attrs.perspectiveType) {
    narratorContext.perspectiveType = attrs.perspectiveType as
      | 'first-person'
      | 'third-person-limited'
      | 'third-person-omniscient'
      | 'second-person';
  }
  
  return narratorContext;
}

/**
 * Filter context by scene presence
 * Only characters present in the scene have context
 */
export function filterContextByPresence(
  context: MultiAgentContext,
  sceneId?: string
): MultiAgentContext {
  if (!sceneId || !context.scene) {
    return context;
  }
  
  // Filter characters to only those present in scene
  const filteredCharacters = context.characters.filter((char) => {
    if (context.scene) {
      return context.scene.characters.some((sceneChar) => sceneChar.characterId === char.characterId);
    }
    return char.scenePresence;
  });
  
  return {
    ...context,
    characters: filteredCharacters,
  };
}

/**
 * Extract scene characters from editor
 */
export function extractSceneCharacters(editor: Editor, sceneId: string): CharacterContext[] {
  const sceneContext = buildSceneContext(editor, sceneId);
  return sceneContext?.characters || [];
}

/**
 * Extract character dialogue from editor
 */
export function extractCharacterDialogue(
  editor: Editor,
  characterId: string
): string[] {
  const characterContext = buildCharacterContext(editor, characterId);
  return characterContext?.dialogue || [];
}

/**
 * Filter context by scene presence
 */
export function filterContextByScenePresence(
  characters: CharacterContext[],
  sceneId: string
): CharacterContext[] {
  return characters.filter((char) => {
    // Check if character is in the scene
    return char.scenePresence;
  });
}

/**
 * Build multi-agent context from editor
 */
export function buildMultiAgentContext(
  editor: Editor,
  options: {
    characterIds?: string[];
    sceneId?: string;
    povId?: string;
    includeStructuredContext?: boolean;
  }
): MultiAgentContext {
  const { characterIds, sceneId, povId, includeStructuredContext = true } = options;
  
  const characters: CharacterContext[] = [];
  
  // Build character contexts
  if (characterIds) {
    characterIds.forEach((characterId) => {
      const charContext = buildCharacterContext(editor, characterId, sceneId);
      if (charContext) {
        characters.push(charContext);
      }
    });
  } else if (sceneId) {
    // Extract all characters from scene
    const sceneChars = extractSceneCharacters(editor, sceneId);
    characters.push(...sceneChars);
  }
  
  // Build scene context
  let scene: SceneContext | undefined;
  if (sceneId) {
    const sceneContext = buildSceneContext(editor, sceneId);
    if (sceneContext) {
      scene = sceneContext;
    }
  }
  
  // Build narrator context
  let narrator: NarratorContext | undefined;
  if (povId) {
    const narratorContext = buildNarratorContext(editor, povId);
    if (narratorContext) {
      narrator = narratorContext;
    }
  }
  
  // Build base context
  const baseContext: MultiAgentContext = {
    characters,
  };
  if (narrator) {
    baseContext.narrator = narrator;
  }
  if (scene) {
    baseContext.scene = scene;
  }
  
  // Filter by scene presence
  const filteredContext = filterContextByPresence(
    baseContext,
    sceneId
  );
  
  // Add structured context if requested
  if (includeStructuredContext) {
    const { state } = editor;
    const { selection } = state;
    const { from, to } = selection;
    
    const structuredContext = extractStructuredContext(editor, {
      from: selection.empty ? Math.max(0, from - 200) : from,
      to: selection.empty ? Math.min(state.doc.content.size, from + 200) : to,
    });
    
    // Merge structured context with multi-agent context
    // Update characters with mark information from structured context
    if (structuredContext.characters.length > 0) {
      structuredContext.characters.forEach((charWithMarks) => {
        const charId = charWithMarks.node.attributes.characterId as string;
        const existingChar = filteredContext.characters.find(
          (char) => char.characterId === charId
        );
        
        if (existingChar) {
          // Update character context with mark information
          // Marks情報を既存のCharacterContextに統合
          if (charWithMarks.marks.length > 0) {
            // Emotion marksをemotionStateに統合
            const emotionMarks = charWithMarks.marks.filter((mark) => mark.type === 'emotion');
            if (emotionMarks.length > 0) {
              emotionMarks.forEach((mark) => {
                if (mark.attributes.emotionVector) {
                  existingChar.attributes = {
                    ...existingChar.attributes,
                    emotionVector: mark.attributes.emotionVector,
                  };
                }
              });
            }
          }
        } else {
          // 新規CharacterContextを作成
          const newCharContext: CharacterContext = {
            characterId: charId,
            name: charWithMarks.node.name,
            attributes: charWithMarks.node.attributes,
            relationships: [],
            dialogue: [],
            scenePresence: sceneId ? true : false,
          };
          
          // Marks情報を統合
          charWithMarks.marks.forEach((mark) => {
            if (mark.type === 'emotion' && mark.attributes.emotionVector) {
              newCharContext.attributes = {
                ...newCharContext.attributes,
                emotionVector: mark.attributes.emotionVector,
              };
            }
          });
          
          filteredContext.characters.push(newCharContext);
        }
      });
    }
    
    // Update scene context with location from structured context
    if (structuredContext.location && filteredContext.scene) {
      filteredContext.scene.location = {
        id: structuredContext.location.attributes.locationId as string || '',
        name: structuredContext.location.name,
      };
    }
    
    // Add dialogue information from structured context
    if (structuredContext.dialogue.length > 0 && filteredContext.scene) {
      structuredContext.dialogue.forEach((dialogue) => {
        if (dialogue.characterId) {
          const charContext = filteredContext.characters.find(
            (char) => char.characterId === dialogue.characterId
          );
          if (charContext) {
            charContext.dialogue.push(dialogue.text);
          }
        }
      });
    }
    
    // Add emotion arc from structured context emotions
    if (structuredContext.emotions.length > 0) {
      const emotionArc = structuredContext.emotions.map((emotion, index) => {
        const emotionVector = emotion.attributes.emotionVector as Record<string, number> | undefined;
        return {
          position: index + 1,
          targetEmotions: emotionVector || {},
        };
      });
      
      filteredContext.emotionArc = emotionArc;
    }
    
    filteredContext.structuredContext = structuredContext;
  }
  
  return filteredContext;
}

