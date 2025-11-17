/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/theme-mark
 * 
 * Theme Mark - テーママスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface ThemeMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    themeMark: {
      /**
       * Toggle theme mark
       */
      toggleThemeMark: () => ReturnType;
      /**
       * Set theme mark
       */
      setThemeMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const ThemeMark = Mark.create<ThemeMarkOptions>({
  name: 'themeMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-theme-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-theme-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleThemeMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setThemeMark:
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

