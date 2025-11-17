/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/technology-node-extension
 * 
 * Technologyノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { TechnologyNode as TechnologyNodeType } from '@/types/jsonld';

export interface TechnologyNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    technology: {
      insertTechnology: (attributes: Partial<TechnologyNodeType>) => ReturnType;
      updateTechnology: (attributes: Partial<TechnologyNodeType>) => ReturnType;
    };
  }
}

export const TechnologyNode = Node.create<TechnologyNodeOptions>({
  name: 'technology',

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
      technologyId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-technology-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.technologyId) {
            return {};
          }
          return {
            'data-technology-id': attributes.technologyId,
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
      description: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-description'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.description) {
            return {};
          }
          return {
            'data-description': attributes.description,
          };
        },
      },
      certification: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const certification = element.getAttribute('data-certification');
          return certification ? { '@id': certification } : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.certification) {
            return {};
          }
          const certId =
            typeof attributes.certification === 'object' && '@id' in attributes.certification
              ? attributes.certification['@id']
              : attributes.certification;
          return {
            'data-certification': certId,
          };
        },
      },
      infraNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-infra-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.infraNote) {
            return {};
          }
          return {
            'data-infra-note': attributes.infraNote,
          };
        },
      },
      operationalNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-operational-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.operationalNote) {
            return {};
          }
          return {
            'data-operational-note': attributes.operationalNote,
          };
        },
      },
      securityNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-security-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.securityNote) {
            return {};
          }
          return {
            'data-security-note': attributes.securityNote,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="technology"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'technology',
        class: 'technology-node inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200',
      }),
      HTMLAttributes.name || HTMLAttributes.technologyId || 'Technology',
    ];
  },

  addCommands() {
    return {
      insertTechnology:
        (attributes: Partial<TechnologyNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateTechnology:
        (attributes: Partial<TechnologyNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

