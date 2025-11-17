/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/relationship-mark
 * 
 * Relationship Mark - 関係性マスク用のMark
 */
import { Mark, mergeAttributes } from '@tiptap/core';

export interface RelationshipMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    relationshipMark: {
      /**
       * Toggle relationship mark
       */
      toggleRelationshipMark: () => ReturnType;
      /**
       * Set relationship mark
       */
      setRelationshipMark: (enabled: boolean) => ReturnType;
    };
  }
}

export const RelationshipMark = Mark.create<RelationshipMarkOptions>({
  name: 'relationshipMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-relationship-mask="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-relationship-mask': 'true',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleRelationshipMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      setRelationshipMark:
        (enabled: boolean) =>
        ({ commands }) => {
          return commands.setMark(this.name, enabled ? {} : null);
        },
    };
  },
});

