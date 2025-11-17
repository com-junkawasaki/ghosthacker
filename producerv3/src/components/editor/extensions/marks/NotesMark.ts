/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/notes-mark
 * 
 * Notes Mark - ノートマスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface NotesMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    notesMark: {
      /**
       * Toggle notes mark
       */
      toggleNotesMark: () => ReturnType;
      /**
       * Set notes mark
       */
      setNotesMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const NotesMark = Mark.create<NotesMarkOptions>({
  name: 'notesMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-notes-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-notes-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleNotesMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setNotesMark:
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

