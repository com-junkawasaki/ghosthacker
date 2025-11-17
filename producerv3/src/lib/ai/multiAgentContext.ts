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
  
  return {
    sceneId,
    name: sceneNode.name,
    characters,
    location,
  };
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
        povNode = {
          type: 'pov',
          name: (attrs.name as string) || 'Unknown',
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
  
  return {
    povId,
    characterId,
    perspectiveType: attrs.perspectiveType as
      | 'first-person'
      | 'third-person-limited'
      | 'third-person-omniscient'
      | 'second-person'
      | undefined,
    name: povNode.name,
  };
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
  }
): MultiAgentContext {
  const { characterIds, sceneId, povId } = options;
  
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
  
  // Filter by scene presence
  const filteredContext = filterContextByPresence(
    {
      characters,
      narrator,
      scene,
    },
    sceneId
  );
  
  return filteredContext;
}

