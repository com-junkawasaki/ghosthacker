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
import { sanitizeNodeAttributes } from '@/lib/editor/sanitizeAttributes';

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
    
    // mergeAttributes の結果を検証し、配列が含まれていないことを確認
    const mergedAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': nodeType,
      class: nodeClasses,
    });
    
    // class が配列の場合は文字列に変換
    if (Array.isArray(mergedAttrs.class)) {
      mergedAttrs.class = mergedAttrs.class.join(' ');
    }
    
    // 配列が含まれていないことを確認（renderSpec が配列を期待しないため）
    const sanitizedAttrs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(mergedAttrs)) {
      if (Array.isArray(value)) {
        // 配列の場合は文字列に変換（class 属性など）
        sanitizedAttrs[key] = value.join(' ');
      } else {
        sanitizedAttrs[key] = value;
      }
    }
    
    return [
      'div',
      sanitizedAttrs,
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
          // ts-patternを使用して型安全にattributesをサニタイズ
          // ビルド時に型チェック可能で、配列やオブジェクトを適切に変換
          const sanitizedAttributes = sanitizeNodeAttributes(attributes);
          
          // Use insertContent to avoid text node creation errors
          // Tiptap's insertContent handles node creation more safely
          // Block Container Node requires at least one paragraph child
          return commands.insertContent({
            type: this.name,
            attrs: sanitizedAttributes,
            content: [{ type: 'paragraph' }],
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

