/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/location-node-extension
 * 
 * Locationノード拡張
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { LocationNode as LocationNodeType } from '@/types/jsonld';

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

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      locationId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-location-id'),
        renderHTML: (attributes) => {
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
        parseHTML: (element) => element.getAttribute('data-name'),
        renderHTML: (attributes) => {
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
        parseHTML: (element) => element.getAttribute('data-description'),
        renderHTML: (attributes) => {
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
        parseHTML: (element) => {
          const year = element.getAttribute('data-year');
          return year ? parseInt(year, 10) : null;
        },
        renderHTML: (attributes) => {
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
        parseHTML: (element) => element.getAttribute('data-hazard-note'),
        renderHTML: (attributes) => {
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
        parseHTML: (element) => element.getAttribute('data-operational-note'),
        renderHTML: (attributes) => {
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
        parseHTML: (element) => element.getAttribute('data-security-note'),
        renderHTML: (attributes) => {
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
        tag: 'span[data-type="location"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'location',
        class: 'location-node inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200',
      }),
      HTMLAttributes.name || HTMLAttributes.locationId || 'Location',
    ];
  },

  addCommands() {
    return {
      insertLocation:
        (attributes: Partial<LocationNodeType>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
      updateLocation:
        (attributes: Partial<LocationNodeType>) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attributes);
        },
    };
  },
});

