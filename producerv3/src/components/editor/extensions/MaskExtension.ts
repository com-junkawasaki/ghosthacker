/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/mask-extension
 * 
 * マスク機能拡張
 * 10種類のマスクタイプごとに個別のマスク属性を追加
 */
import { Extension } from '@tiptap/core';
import { MaskType } from '@/types/jsonld';
import type { Transaction, EditorState } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface MaskExtensionOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mask: {
      /**
       * Toggle mask for a specific mask type
       */
      toggleMask: (maskType: MaskType['type']) => ReturnType;
      /**
       * Set mask state for a specific mask type
       */
      setMask: (maskType: MaskType['type'], enabled: boolean) => ReturnType;
      /**
       * Toggle all masks
       */
      toggleAllMasks: () => ReturnType;
    };
  }
}

export const MaskExtension = Extension.create<MaskExtensionOptions>({
  name: 'mask',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: [
          'character',
          'ghost',
          'location',
          'organization',
          'technology',
          'episode',
          'scene',
          'arc',
          'motif',
          'season',
          'timeline',
          'pov',
          'beat',
          'sourceRef',
          'event',
          'occupation',
          'setting',
        ],
        attributes: {
          emotionMask: {
            default: false,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-emotion-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.emotionMask) {
                return {};
              }
              return {
                'data-emotion-mask': 'true',
              };
            },
          },
          themeMask: {
            default: false,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-theme-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.themeMask) {
                return {};
              }
              return {
                'data-theme-mask': 'true',
              };
            },
          },
          contextMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-context-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.contextMask) {
                return {};
              }
              return {
                'data-context-mask': 'true',
              };
            },
          },
          notesMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-notes-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.notesMask) {
                return {};
              }
              return {
                'data-notes-mask': 'true',
              };
            },
          },
          relationshipMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-relationship-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.relationshipMask) {
                return {};
              }
              return {
                'data-relationship-mask': 'true',
              };
            },
          },
          virtueMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-virtue-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.virtueMask) {
                return {};
              }
              return {
                'data-virtue-mask': 'true',
              };
            },
          },
          anchoredToMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-anchored-to-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.anchoredToMask) {
                return {};
              }
              return {
                'data-anchored-to-mask': 'true',
              };
            },
          },
          emitsRepelsAvoidsMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-emits-repels-avoids-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.emitsRepelsAvoidsMask) {
                return {};
              }
              return {
                'data-emits-repels-avoids-mask': 'true',
              };
            },
          },
          phaseMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-phase-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.phaseMask) {
                return {};
              }
              return {
                'data-phase-mask': 'true',
              };
            },
          },
          roleMask: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-role-mask') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.roleMask) {
                return {};
              }
              return {
                'data-role-mask': 'true',
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleMask:
        (maskType: MaskType['type']) =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch?: ((tr: Transaction) => void) | undefined }) => {
          const { selection } = state;
          const { from, to } = selection;

          if (!dispatch) {
            return true;
          }

          const maskAttributeMap: Record<MaskType['type'], string> = {
            emotion: 'emotionMask',
            theme: 'themeMask',
            context: 'contextMask',
            notes: 'notesMask',
            relationship: 'relationshipMask',
            virtue: 'virtueMask',
            anchoredTo: 'anchoredToMask',
            emitsRepelsAvoids: 'emitsRepelsAvoidsMask',
            phase: 'phaseMask',
            role: 'roleMask',
          };

          const attributeName = maskAttributeMap[maskType];
          if (!attributeName) {
            return false;
          }

          state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            const attrs = node.attrs as Record<string, unknown>;
            if (node.isInline && attrs[attributeName] !== undefined) {
              const currentValue = attrs[attributeName] || false;
              tr.setNodeMarkup(pos, undefined, {
                ...attrs,
                [attributeName]: !currentValue,
              });
            }
          });

          return true;
        },
      setMask:
        (maskType: MaskType['type'], enabled: boolean) =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch?: ((tr: Transaction) => void) | undefined }) => {
          const { selection } = state;
          const { from, to } = selection;

          if (!dispatch) {
            return true;
          }

          const maskAttributeMap: Record<MaskType['type'], string> = {
            emotion: 'emotionMask',
            theme: 'themeMask',
            context: 'contextMask',
            notes: 'notesMask',
            relationship: 'relationshipMask',
            virtue: 'virtueMask',
            anchoredTo: 'anchoredToMask',
            emitsRepelsAvoids: 'emitsRepelsAvoidsMask',
            phase: 'phaseMask',
            role: 'roleMask',
          };

          const attributeName = maskAttributeMap[maskType];
          if (!attributeName) {
            return false;
          }

          state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            const attrs = node.attrs as Record<string, unknown>;
            if (node.isInline && attrs[attributeName] !== undefined) {
              tr.setNodeMarkup(pos, undefined, {
                ...attrs,
                [attributeName]: enabled,
              });
            }
          });

          return true;
        },
      toggleAllMasks:
        () =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch?: ((tr: Transaction) => void) | undefined }) => {
          const { selection } = state;
          const { from, to } = selection;

          if (!dispatch) {
            return true;
          }

          const maskAttributes = [
            'emotionMask',
            'themeMask',
            'contextMask',
            'notesMask',
            'relationshipMask',
            'virtueMask',
            'anchoredToMask',
            'emitsRepelsAvoidsMask',
            'phaseMask',
            'roleMask',
          ];

          state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            if (node.isInline) {
              const attrs = node.attrs as Record<string, unknown>;
              const newAttrs = { ...attrs };
              let hasAnyMask = false;

              maskAttributes.forEach((attr) => {
                if (attrs[attr] !== undefined) {
                  hasAnyMask = hasAnyMask || attrs[attr] === true;
                }
              });

              maskAttributes.forEach((attr) => {
                if (attrs[attr] !== undefined) {
                  newAttrs[attr] = !hasAnyMask;
                }
              });

              tr.setNodeMarkup(pos, undefined, newAttrs);
            }
          });

          return true;
        },
    };
  },
});

