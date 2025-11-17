/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/character-node-extension
 * 
 * Characterノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { CharacterNode as CharacterNodeType } from '@/types/jsonld';

export interface CharacterNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    character: {
      /**
       * Insert a character node
       */
      insertCharacter: (attributes: Partial<CharacterNodeType>) => ReturnType;
      /**
       * Update a character node
       */
      updateCharacter: (attributes: Partial<CharacterNodeType>) => ReturnType;
    };
  }
}

export const CharacterNode = Node.create<CharacterNodeOptions>({
  name: 'character',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      characterId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-character-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.characterId) {
            return {};
          }
          return {
            'data-character-id': attributes.characterId,
          };
        },
      },
      name: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-name'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.name) {
            return {};
          }
          return {
            'data-name': attributes.name,
          };
        },
      },
      callsign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-callsign'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.callsign) {
            return {};
          }
          return {
            'data-callsign': attributes.callsign,
          };
        },
      },
      description: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-description'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.description) {
            return {};
          }
          return {
            'data-description': attributes.description,
          };
        },
      },
      age: {
        default: null,
        parseHTML: (element) => {
          const age = element.getAttribute('data-age');
          return age ? parseInt(age, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.age) {
            return {};
          }
          return {
            'data-age': attributes.age.toString(),
          };
        },
      },
      occupation: {
        default: null,
        parseHTML: (element) => {
          const occupation = element.getAttribute('data-occupation');
          return occupation ? JSON.parse(occupation) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.occupation) {
            return {};
          }
          return {
            'data-occupation': JSON.stringify(attributes.occupation),
          };
        },
      },
      role: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-role'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.role) {
            return {};
          }
          return {
            'data-role': attributes.role,
          };
        },
      },
      virtue: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-virtue'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.virtue) {
            return {};
          }
          return {
            'data-virtue': attributes.virtue,
          };
        },
      },
      alternateName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alternate-name'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.alternateName) {
            return {};
          }
          return {
            'data-alternate-name': attributes.alternateName,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="character"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'character',
        class: 'character-node inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200',
      }),
      (HTMLAttributes.name as string) || (HTMLAttributes.characterId as string) || 'Character',
    ];
  },

  addCommands() {
    return {
      insertCharacter:
        (attributes: Partial<CharacterNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateCharacter:
        (attributes: Partial<CharacterNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

