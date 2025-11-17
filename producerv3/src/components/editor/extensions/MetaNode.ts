/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/meta-node-extension
 * 
 * メタノード拡張（SourceRef/Event/Occupation/Setting）
 */
import { Node, mergeAttributes, type CommandProps } from '@tiptap/core';
import {
  SourceRefNode as SourceRefNodeType,
  EventNode as EventNodeType,
  OccupationNode as OccupationNodeType,
  SettingNode as SettingNodeType,
} from '@/types/jsonld';
import { getNodeLabelClasses, getNodeTypeDisplayName } from '@/lib/editor/nodeColors';
import { sanitizeNodeAttributes } from '@/lib/editor/sanitizeAttributes';

export interface MetaNodeOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sourceRef: {
      insertSourceRef: (attributes: Partial<SourceRefNodeType>) => ReturnType;
      updateSourceRef: (attributes: Partial<SourceRefNodeType>) => ReturnType;
    };
    event: {
      insertEvent: (attributes: Partial<EventNodeType>) => ReturnType;
      updateEvent: (attributes: Partial<EventNodeType>) => ReturnType;
    };
    occupation: {
      insertOccupation: (attributes: Partial<OccupationNodeType>) => ReturnType;
      updateOccupation: (attributes: Partial<OccupationNodeType>) => ReturnType;
    };
    setting: {
      insertSetting: (attributes: Partial<SettingNodeType>) => ReturnType;
      updateSetting: (attributes: Partial<SettingNodeType>) => ReturnType;
    };
  }
}

const createMetaNode = (
  name: string,
  nodeType: string,
  bgColor: string,
  textColor: string
) => {
  return Node.create<MetaNodeOptions>({
    name,

    addOptions() {
      return {
        HTMLAttributes: {},
      };
    },

    group: 'inline',

    inline: true,

    atom: true,

    addAttributes() {
      const baseAttributes: Record<string, unknown> = {
        [`${name}Id`]: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}-id`),
          renderHTML: (attributes: Record<string, unknown>) => {
            const id = attributes[`${name}Id`];
            if (!id) {
              return {};
            }
            return {
              [`data-${name}-id`]: id,
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
      };

      // SourceRef固有の属性
      if (name === 'sourceRef') {
        baseAttributes.path = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-path'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.path) {
              return {};
            }
            return {
              'data-path': attributes.path,
            };
          },
        };
        baseAttributes.lang = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-lang'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.lang) {
              return {};
            }
            return {
              'data-lang': attributes.lang,
            };
          },
        };
        baseAttributes.selectionHint = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-selection-hint'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.selectionHint) {
              return {};
            }
            return {
              'data-selection-hint': attributes.selectionHint,
            };
          },
        };
      }

      // Event固有の属性
      if (name === 'event') {
        baseAttributes.startDate = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-start-date'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.startDate) {
              return {};
            }
            return {
              'data-start-date': attributes.startDate,
            };
          },
        };
        baseAttributes.endDate = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-end-date'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.endDate) {
              return {};
            }
            return {
              'data-end-date': attributes.endDate,
            };
          },
        };
        baseAttributes.temporalCoverage = {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-temporal-coverage'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.temporalCoverage) {
              return {};
            }
            return {
              'data-temporal-coverage': attributes.temporalCoverage,
            };
          },
        };
      }

      // Setting固有の属性
      if (name === 'setting') {
        baseAttributes.ghostType = {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const ghostType = element.getAttribute('data-ghost-type');
            return ghostType ? JSON.parse(ghostType) : null;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.ghostType) {
              return {};
            }
            return {
              'data-ghost-type': JSON.stringify(attributes.ghostType),
            };
          },
        };
      }

      return baseAttributes;
    },

    parseHTML() {
      return [
        {
          tag: `span[data-type="${nodeType}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      const displayName = HTMLAttributes.name || HTMLAttributes[`${name}Id`] || name.charAt(0).toUpperCase() + name.slice(1);
      // nodeTypeをnodeColorsのマッピングに合わせる（'source-ref' -> 'sourceRef'）
      const colorNodeType = nodeType === 'source-ref' ? 'sourceRef' : nodeType;
      const labelClasses = getNodeLabelClasses(colorNodeType);
      const labelText = getNodeTypeDisplayName(colorNodeType);
      
      return [
        'span',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': nodeType,
          class: `${nodeType}-node inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:opacity-80`,
          style: `background-color: ${bgColor.includes('bg-') ? 'var(--color-' + bgColor.replace('bg-', '').replace('-', '-') + ')' : bgColor}; color: ${textColor.includes('text-') ? 'var(--color-' + textColor.replace('text-', '').replace('-', '-') + ')' : textColor};`,
        }),
        [
          ['span', { class: labelClasses }, labelText],
          displayName,
        ],
      ];
    },

    addCommands() {
      return {
        [`insert${name.charAt(0).toUpperCase() + name.slice(1)}`]:
          (attributes: Record<string, unknown>) =>
          ({ commands }: CommandProps) => {
            // ts-patternを使用して型安全にattributesをサニタイズ
            // ビルド時に型チェック可能で、配列やオブジェクトを適切に変換
            const sanitizedAttributes = sanitizeNodeAttributes(attributes);
            
            return commands.insertContent({
              type: this.name,
              attrs: sanitizedAttributes,
            });
          },
        [`update${name.charAt(0).toUpperCase() + name.slice(1)}`]:
          (attributes: Record<string, unknown>) =>
          ({ commands }: CommandProps) => {
            return commands.updateAttributes(this.name, attributes);
          },
      };
    },
  });
};

export const SourceRefNode = createMetaNode('sourceRef', 'source-ref', 'bg-slate-100', 'text-slate-800');
export const EventNode = createMetaNode('event', 'event', 'bg-violet-100', 'text-violet-800');
export const OccupationNode = createMetaNode('occupation', 'occupation', 'bg-amber-100', 'text-amber-800');
export const SettingNode = createMetaNode('setting', 'setting', 'bg-emerald-100', 'text-emerald-800');

