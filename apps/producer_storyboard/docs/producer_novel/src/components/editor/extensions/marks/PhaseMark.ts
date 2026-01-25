/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/phase-mark
 * 
 * Phase Mark - フェーズマスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface PhaseMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    phaseMark: {
      /**
       * Toggle phase mark
       */
      togglePhaseMark: () => ReturnType;
      /**
       * Set phase mark
       */
      setPhaseMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const PhaseMark = Mark.create<PhaseMarkOptions>({
  name: 'phaseMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-phase-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-phase-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      togglePhaseMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setPhaseMark:
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

