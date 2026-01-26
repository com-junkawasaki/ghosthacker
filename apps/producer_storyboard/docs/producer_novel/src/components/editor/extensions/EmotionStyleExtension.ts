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

  // Note: EmotionStyleExtension is disabled because it causes schema issues
  // Styles are applied via CSS using data-emotion-vector attribute instead
  // This extension is kept for reference but not used
  addGlobalAttributes() {
    return [];
  },
});

