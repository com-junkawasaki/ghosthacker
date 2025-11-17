/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/ghost-node-extension
 * 
 * Ghostノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { GhostNode as GhostNodeType } from '@/types/jsonld';
import { getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';

export interface GhostNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ghost: {
      insertGhost: (attributes: Partial<GhostNodeType>) => ReturnType;
      updateGhost: (attributes: Partial<GhostNodeType>) => ReturnType;
    };
  }
}

export const GhostNode = Node.create<GhostNodeOptions>({
  name: 'ghost',

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
      ghostId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-ghost-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.ghostId) {
            return {};
          }
          return {
            'data-ghost-id': attributes.ghostId,
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
      ghostType: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-ghost-type'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.ghostType) {
            return {};
          }
          return {
            'data-ghost-type': attributes.ghostType,
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
      master: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const master = element.getAttribute('data-master');
          return master ? { '@id': master } : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.master) {
            return {};
          }
          const masterId =
            typeof attributes.master === 'object' && '@id' in attributes.master
              ? attributes.master['@id']
              : attributes.master;
          return {
            'data-master': masterId,
          };
        },
      },
      createdBy: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const createdBy = element.getAttribute('data-created-by');
          return createdBy ? { '@id': createdBy } : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.createdBy) {
            return {};
          }
          const createdById =
            typeof attributes.createdBy === 'object' && '@id' in attributes.createdBy
              ? attributes.createdBy['@id']
              : attributes.createdBy;
          return {
            'data-created-by': createdById,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="ghost"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const nodeType = 'ghost';
    const name = (HTMLAttributes.name as string) || (HTMLAttributes.ghostId as string) || 'Ghost';
    const labelClasses = getNodeLabelClasses(nodeType);
    const labelText = getNodeTypeDisplayName(nodeType);
    
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': nodeType,
        class: `${nodeType}-node inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:opacity-80`,
        style: 'background-color: rgb(249 250 251); color: rgb(31 41 55);',
      }),
      [
        ['span', { class: labelClasses }, labelText],
        name,
      ],
    ];
  },

  addCommands() {
    return {
      insertGhost:
        (attributes: Partial<GhostNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateGhost:
        (attributes: Partial<GhostNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

