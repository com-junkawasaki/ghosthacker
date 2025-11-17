/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/mark-extension
 * 
 * Mark Extension - 10種類のMarkを統合的に制御するExtension
 */
import { Extension, type RawCommands } from '@tiptap/core';
import type { MaskType } from '@/types/jsonld';

export interface MarkExtensionOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mark: {
      /**
       * Toggle mark for a specific mark type
       */
      toggleMark: (markType: MaskType['type']) => ReturnType;
      /**
       * Set mark state for a specific mark type
       */
      setMark: (markType: MaskType['type'], enabled: boolean) => ReturnType;
      /**
       * Toggle all marks
       */
      toggleAllMarks: () => ReturnType;
    };
  }
}

export const MarkExtension = Extension.create<MarkExtensionOptions>({
  name: 'markExtension',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addCommands(): Partial<RawCommands> {
    // @ts-expect-error - Tiptap's RawCommands type is complex and our custom commands don't match exactly
    return {
      toggleMark:
        (markType: MaskType['type']) =>
        ({ commands }) => {
          const markNameMap: Record<MaskType['type'], string> = {
            emotion: 'emotionMark',
            theme: 'themeMark',
            context: 'contextMark',
            notes: 'notesMark',
            relationship: 'relationshipMark',
            virtue: 'virtueMark',
            anchoredTo: 'anchoredToMark',
            emitsRepelsAvoids: 'emitsRepelsAvoidsMark',
            phase: 'phaseMark',
            role: 'roleMark',
          };

          const markName = markNameMap[markType];
          if (!markName) {
            return false;
          }

          return commands.toggleMark(markName) as boolean;
        },
      // @ts-expect-error - setMark command signature doesn't match Tiptap's expected signature
      setMark:
        (markType: MaskType['type'], enabled: boolean) =>
        ({ commands }) => {
          const markNameMap: Record<MaskType['type'], string> = {
            emotion: 'emotionMark',
            theme: 'themeMark',
            context: 'contextMark',
            notes: 'notesMark',
            relationship: 'relationshipMark',
            virtue: 'virtueMark',
            anchoredTo: 'anchoredToMark',
            emitsRepelsAvoids: 'emitsRepelsAvoidsMark',
            phase: 'phaseMark',
            role: 'roleMark',
          };

          const markName = markNameMap[markType];
          if (!markName) {
            return false;
          }

          if (enabled) {
            return commands.setMark(markName) as boolean;
          } else {
            return commands.unsetMark(markName) as boolean;
          }
        },
      toggleAllMarks:
        () =>
        ({ commands, state, dispatch }) => {
          const markTypes: MaskType['type'][] = [
            'emotion',
            'theme',
            'context',
            'notes',
            'relationship',
            'virtue',
            'anchoredTo',
            'emitsRepelsAvoids',
            'phase',
            'role',
          ];

          const { from, to } = state.selection;
          if (from === to) {
            return false;
          }

          if (!dispatch) {
            return true;
          }

          const markNameMap: Record<MaskType['type'], string> = {
            emotion: 'emotionMark',
            theme: 'themeMark',
            context: 'contextMark',
            notes: 'notesMark',
            relationship: 'relationshipMark',
            virtue: 'virtueMark',
            anchoredTo: 'anchoredToMark',
            emitsRepelsAvoids: 'emitsRepelsAvoidsMark',
            phase: 'phaseMark',
            role: 'roleMark',
          };

          // Check if any mark is active in the selection
          let hasAnyMark = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.isText && node.marks.length > 0) {
              markTypes.forEach((markType) => {
                const markName = markNameMap[markType];
                if (markName && node.marks.some((m) => m.type.name === markName)) {
                  hasAnyMark = true;
                }
              });
            }
          });

          // Apply all marks using transaction
          const tr = state.tr;
          markTypes.forEach((markType) => {
            const markName = markNameMap[markType];
            if (markName) {
              const markTypeObj = state.schema.marks[markName];
              if (markTypeObj) {
                if (hasAnyMark) {
                  // Remove all marks
                  tr.removeMark(from, to, markTypeObj);
                } else {
                  // Add all marks
                  tr.addMark(from, to, markTypeObj.create());
                }
              }
            }
          });

          dispatch(tr);
          return true;
        },
    };
  },
});

