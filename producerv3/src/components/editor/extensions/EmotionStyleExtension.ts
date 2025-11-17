/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-style-extension
 * 
 * Emotion Style Extension for Tiptap
 * Applies visual styles (background color, border color) to nodes based on emotion scores
 */
import { Extension } from '@tiptap/core';
import type { EmotionScore } from '@/types/jsonld';
import { getEmotionStyle, getEmotionClassName } from '@/lib/editor/emotionVisualization';

export interface EmotionStyleExtensionOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const EmotionStyleExtension = Extension.create<EmotionStyleExtensionOptions>({
  name: 'emotionStyle',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'character',
          'ghost',
          'location',
          'organization',
          'technology',
          'episode',
          'scene',
          'arc',
          'motif',
          'season',
          'timeline',
          'pov',
          'beat',
          'sourceRef',
          'event',
          'occupation',
          'setting',
          'chapterLink',
        ],
        attributes: {
          emotionStyle: {
            default: null,
            parseHTML: () => null, // Style is computed, not parsed
            renderHTML: (attributes: Record<string, unknown>) => {
              const emotionVector = attributes.emotionVector as EmotionScore[] | null | undefined;
              if (!emotionVector || emotionVector.length === 0) {
                return {};
              }

              const style = getEmotionStyle(emotionVector);
              const className = getEmotionClassName(emotionVector);

              const styleString = Object.entries(style)
                .map(([key, value]) => {
                  const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                  return `${cssKey}: ${value}`;
                })
                .join('; ');

              const result: Record<string, string> = {};
              if (styleString) {
                result.style = styleString;
              }
              if (className) {
                result.class = className;
              }

              return result;
            },
          },
        },
      },
    ];
  },
});

