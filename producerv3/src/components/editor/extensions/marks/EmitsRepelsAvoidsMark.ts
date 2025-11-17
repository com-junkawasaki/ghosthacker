/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/emits-repels-avoids-mark
 * 
 * EmitsRepelsAvoids Mark - 放出/反発/回避マスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface EmitsRepelsAvoidsMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emitsRepelsAvoidsMark: {
      /**
       * Toggle emitsRepelsAvoids mark
       */
      toggleEmitsRepelsAvoidsMark: () => ReturnType;
      /**
       * Set emitsRepelsAvoids mark
       */
      setEmitsRepelsAvoidsMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const EmitsRepelsAvoidsMark = Mark.create<EmitsRepelsAvoidsMarkOptions>({
  name: 'emitsRepelsAvoidsMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-emits-repels-avoids-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-emits-repels-avoids-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleEmitsRepelsAvoidsMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setEmitsRepelsAvoidsMark:
        (enabled: boolean) =>
        ({ commands }) => {
          return commands.setMark(this.name, enabled ? {} : null);
        },
    };
  },
});

