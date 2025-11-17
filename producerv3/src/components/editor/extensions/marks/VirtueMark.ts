/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/virtue-mark
 * 
 * Virtue Mark - 美徳マスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface VirtueMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    virtueMark: {
      /**
       * Toggle virtue mark
       */
      toggleVirtueMark: () => ReturnType;
      /**
       * Set virtue mark
       */
      setVirtueMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const VirtueMark = Mark.create<VirtueMarkOptions>({
  name: 'virtueMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-virtue-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-virtue-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleVirtueMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setVirtueMark:
        (enabled: boolean) =>
        ({ commands }) => {
          return commands.setMark(this.name, enabled ? {} : null);
        },
    };
  },
});

