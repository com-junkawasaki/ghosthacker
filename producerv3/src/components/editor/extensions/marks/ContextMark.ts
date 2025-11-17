/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/context-mark
 * 
 * Context Mark - コンテキストマスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface ContextMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    contextMark: {
      /**
       * Toggle context mark
       */
      toggleContextMark: () => ReturnType;
      /**
       * Set context mark
       */
      setContextMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const ContextMark = Mark.create<ContextMarkOptions>({
  name: 'contextMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-context-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-context-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleContextMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setContextMark:
        (enabled: boolean) =>
        ({ commands }) => {
          return commands.setMark(this.name, enabled ? {} : null);
        },
    };
  },
});

