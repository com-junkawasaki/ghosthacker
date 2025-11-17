/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emotion-mark
 * 
 * Emotion Mark - 感情マスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface EmotionMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emotionMark: {
      /**
       * Toggle emotion mark
       */
      toggleEmotionMark: () => ReturnType;
      /**
       * Set emotion mark
       */
      setEmotionMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const EmotionMark = Mark.create<EmotionMarkOptions>({
  name: 'emotionMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-emotion-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-emotion-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleEmotionMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setEmotionMark:
        (enabled: boolean) =>
        ({ commands }) => {
          return commands.setMark(this.name, enabled ? {} : null);
        },
    };
  },
});

