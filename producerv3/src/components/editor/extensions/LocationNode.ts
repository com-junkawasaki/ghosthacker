/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/location-node-extension
 * 
 * Locationノード拡張
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import { LocationNode as LocationNodeType } from '@/types/jsonld';
import { getNodeClasses, getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';

export interface LocationNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    location: {
      insertLocation: (attributes: Partial<LocationNodeType>) => ReturnType;
      updateLocation: (attributes: Partial<LocationNodeType>) => ReturnType;
    };
  }
}

export const LocationNode = Node.create<LocationNodeOptions>({
  name: 'location',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  content: 'paragraph+',

  atom: false,

  addAttributes() {
    return {
      locationId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-location-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.locationId) {
            return {};
          }
          return {
            'data-location-id': attributes.locationId,
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
      year: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const year = element.getAttribute('data-year');
          return year ? parseInt(year, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.year) {
            return {};
          }
          return {
            'data-year': attributes.year.toString(),
          };
        },
      },
      hazardNote: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-hazard-note'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.hazardNote) {
            return {};
          }
          return {
            'data-hazard-note': attributes.hazardNote,
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
        tag: 'div[data-type="location"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }: { HTMLAttributes: Record<string, unknown>; node?: unknown }) {
    const name = (HTMLAttributes.name as string) || (HTMLAttributes.locationId as string) || 'Location';
    const nodeType = 'location';
    const nodeClasses = getNodeClasses(nodeType);
    const labelClasses = getNodeLabelClasses(nodeType);
    const labelText = getNodeTypeDisplayName(nodeType);
    
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': nodeType,
        class: nodeClasses,
      }),
      [
        ['div', { class: 'flex items-center gap-2 mb-2' }, [
          ['span', { class: labelClasses }, labelText],
          ['span', { class: 'font-semibold flex-1' }, name],
        ]],
        ['div', { class: 'node-content' }, 0], // 0 = 子ノードをここに挿入
      ],
    ];
  },

  addCommands() {
    return {
      insertLocation:
        (attributes: Partial<LocationNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateLocation:
        (attributes: Partial<LocationNodeType>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

