/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/anchored-to-mark
 * 
 * AnchoredTo Mark - アンカー先マスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface AnchoredToMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    anchoredToMark: {
      /**
       * Toggle anchoredTo mark
       */
      toggleAnchoredToMark: () => ReturnType;
      /**
       * Set anchoredTo mark
       */
      setAnchoredToMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const AnchoredToMark = Mark.create<AnchoredToMarkOptions>({
  name: 'anchoredToMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-anchored-to-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-anchored-to-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleAnchoredToMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setAnchoredToMark:
        (enabled: boolean) =>
        ({ commands }) => {
          if (enabled) {
            return commands.setMark(this.name);
          } else {
            return commands.unsetMark(this.name);
          }
        },
    };
  },
});

