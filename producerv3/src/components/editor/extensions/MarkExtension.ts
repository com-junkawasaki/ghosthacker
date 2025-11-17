/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/mark-extension
 * 
 * Mark Extension - 10種類のMarkを統合的に制御するExtension
 */
import { Extension, type RawCommands, type CommandProps } from '@tiptap/core';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode, Mark } from '@tiptap/pm/model';
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

// Type assertion helper to ensure RawCommands compatibility
type MarkExtensionCommands = {
  toggleMark: (markType: MaskType['type']) => (props: CommandProps) => boolean;
  setMark: (markType: MaskType['type'], enabled: boolean) => (props: CommandProps) => boolean;
  toggleAllMarks: () => (props: { state: EditorState; dispatch: ((tr: Transaction) => void) | undefined }) => boolean;
};

export const MarkExtension = Extension.create<MarkExtensionOptions>({
  name: 'markExtension',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addCommands(): Partial<RawCommands> {
    const commands: MarkExtensionCommands = {
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
        ({ state, dispatch }) => {
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
          state.doc.nodesBetween(from, to, (node: ProseMirrorNode) => {
            if (node.isText && node.marks.length > 0) {
              markTypes.forEach((markType) => {
                const markName = markNameMap[markType];
                if (markName && node.marks.some((m: Mark) => m.type.name === markName)) {
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
    return commands as unknown as Partial<RawCommands>;
  },
});

