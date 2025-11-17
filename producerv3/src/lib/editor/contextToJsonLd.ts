/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/generate-context-jsonld
 * 
 * 構造化コンテキストからJSON-LDを生成
 * シーン、場所、人物、感情、文脈をJSON-LD形式で構造化
 */

import type { StructuredContext } from './structuredContextExtractor';

/**
 * JSON-LD形式のコンテキスト
 */
export interface ContextJSONLD {
  '@context': string | Record<string, unknown>;
  '@type': string;
  scene?: {
    '@id'?: string;
    '@type': string;
    name: string;
    [key: string]: unknown;
  } | null;
  location?: {
    '@id'?: string;
    '@type': string;
    name: string;
    [key: string]: unknown;
  } | null;
  characters?: Array<{
    '@id'?: string;
    '@type': string;
    name: string;
    marks?: Array<{
      '@type': string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  dialogue?: Array<{
    '@type': string;
    text: string;
    character?: {
      '@id': string;
      '@type': string;
    };
    emotions?: Array<{
      '@type': string;
      [key: string]: unknown;
    }>;
    contexts?: Array<{
      '@type': string;
      [key: string]: unknown;
    }>;
  }>;
  emotions?: Array<{
    '@type': string;
    [key: string]: unknown;
  }>;
  contexts?: Array<{
    '@type': string;
    [key: string]: unknown;
  }>;
}

/**
 * 構造化コンテキストからJSON-LDを生成
 */
export function generateContextJSONLD(context: StructuredContext): ContextJSONLD {
  const jsonld: ContextJSONLD = {
    '@context': {
      '@version': 1.1,
      '@vocab': 'https://gftd.ai/ontology/epub-editor#',
      'cpm': 'https://gftd.ai/ontology/cpm#',
      'prov': 'http://www.w3.org/ns/prov#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
    },
    '@type': 'DialogueContext',
  };

  // Scene情報
  if (context.scene) {
    const sceneAttrs = context.scene.attributes;
    const sceneId = sceneAttrs.sceneId as string | undefined;
    jsonld.scene = {
      ...(sceneId ? { '@id': sceneId } : {}),
      '@type': 'Scene',
      name: context.scene.name,
      ...Object.fromEntries(
        Object.entries(sceneAttrs).filter(([key]) => 
          !['sceneId', 'name'].includes(key)
        )
      ),
    };
  }

  // Location情報
  if (context.location) {
    const locationAttrs = context.location.attributes;
    const locationId = locationAttrs.locationId as string | undefined;
    jsonld.location = {
      ...(locationId ? { '@id': locationId } : {}),
      '@type': 'Place',
      name: context.location.name,
      ...Object.fromEntries(
        Object.entries(locationAttrs).filter(([key]) => 
          !['locationId', 'name'].includes(key)
        )
      ),
    };
  }

  // Characters情報
  if (context.characters.length > 0) {
    jsonld.characters = context.characters.map((charWithMarks) => {
      const charAttrs = charWithMarks.node.attributes;
      const characterId = charAttrs.characterId as string | undefined;
      const characterJsonld: ContextJSONLD['characters']![0] = {
        ...(characterId ? { '@id': characterId } : {}),
        '@type': 'Person',
        name: charWithMarks.node.name,
        ...Object.fromEntries(
          Object.entries(charAttrs).filter(([key]) => 
            !['characterId', 'name'].includes(key)
          )
        ),
      };

      // Marks情報を追加
      if (charWithMarks.marks.length > 0) {
        characterJsonld.marks = charWithMarks.marks.map((mark) => ({
          '@type': mark.type.charAt(0).toUpperCase() + mark.type.slice(1),
          ...mark.attributes,
        }));
      }

      return characterJsonld;
    });
  }

  // Dialogue情報
  if (context.dialogue.length > 0) {
    jsonld.dialogue = context.dialogue.map((dialogue) => {
      const dialogueJsonld: ContextJSONLD['dialogue']![0] = {
        '@type': 'Dialogue',
        text: dialogue.text,
      };

      // Character情報を追加
      if (dialogue.characterId) {
        const character = context.characters.find(
          (char) => (char.node.attributes.characterId as string) === dialogue.characterId
        );
        
        if (character) {
          dialogueJsonld.character = {
            '@id': dialogue.characterId,
            '@type': 'Person',
          };
        }
      }

      // Emotion Marksを抽出
      const emotionMarks = dialogue.marks.filter((mark) => mark.type === 'emotion');
      if (emotionMarks.length > 0) {
        dialogueJsonld.emotions = emotionMarks.map((mark) => ({
          '@type': 'Emotion',
          ...mark.attributes,
        }));
      }

      // Context Marksを抽出
      const contextMarks = dialogue.marks.filter((mark) => mark.type === 'context');
      if (contextMarks.length > 0) {
        dialogueJsonld.contexts = contextMarks.map((mark) => ({
          '@type': 'Context',
          ...mark.attributes,
        }));
      }

      return dialogueJsonld;
    });
  }

  // Emotions情報（全体）
  if (context.emotions.length > 0) {
    jsonld.emotions = context.emotions.map((emotion) => ({
      '@type': 'Emotion',
      ...emotion.attributes,
    }));
  }

  // Contexts情報（全体）
  if (context.contexts.length > 0) {
    jsonld.contexts = context.contexts.map((ctx) => ({
      '@type': 'Context',
      ...ctx.attributes,
    }));
  }

  return jsonld;
}

/**
 * JSON-LDを文字列として出力
 */
export function generateContextJSONLDString(context: StructuredContext, pretty: boolean = true): string {
  const jsonld = generateContextJSONLD(context);
  return pretty ? JSON.stringify(jsonld, null, 2) : JSON.stringify(jsonld);
}

