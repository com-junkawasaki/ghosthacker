/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/role-mark
 * 
 * Role Mark - 役割マスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface RoleMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    roleMark: {
      /**
       * Toggle role mark
       */
      toggleRoleMark: () => ReturnType;
      /**
       * Set role mark
       */
      setRoleMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const RoleMark = Mark.create<RoleMarkOptions>({
  name: 'roleMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-role-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-role-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleRoleMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setRoleMark:
        (enabled: boolean) =>
        ({ commands }) => {
          return commands.setMark(this.name, enabled ? {} : null);
        },
    };
  },
});

