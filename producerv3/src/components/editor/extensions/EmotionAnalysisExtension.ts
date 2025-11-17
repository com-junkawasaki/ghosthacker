/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/analyze-emotions
 * 
 * Emotion Analysis Extension for Tiptap
 * Adds emotion analysis capabilities to all node types (paragraph, character, scene, beat, etc.)
 */
import { Extension, type Chain } from '@tiptap/core';
import { EmotionProfile, EmotionScore } from '@/types/jsonld';
import type { Transaction, EditorState } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface EmotionAnalysisExtensionOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emotionAnalysis: {
      /**
       * Analyze emotions for selected text or paragraph
       */
      analyzeEmotions: (text: string) => ReturnType;
      /**
       * Set emotion profile for a paragraph
       */
      setEmotionProfile: (profile: EmotionProfile) => ReturnType;
      /**
       * Clear emotion profile
       */
      clearEmotionProfile: () => ReturnType;
    };
  }
}

export const EmotionAnalysisExtension = Extension.create<EmotionAnalysisExtensionOptions>({
  name: 'emotionAnalysis',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addGlobalAttributes() {
    // Apply emotion attributes to all node types (excluding 'doc' which is the document root)
    const allNodeTypes = [
      'paragraph',
      'heading',
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
      'chapterLink',
      'blockquote',
      'bulletList',
      'orderedList',
      'listItem',
      'hardBreak',
      'image',
      'link',
    ];

    return [
      {
        types: allNodeTypes,
        attributes: {
          emotionProfile: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const data = element.getAttribute('data-emotion-profile');
              if (!data) return null;
              try {
                return JSON.parse(data) as EmotionProfile;
              } catch {
                return null;
              }
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.emotionProfile) {
                return {};
              }
              try {
                return {
                  'data-emotion-profile': JSON.stringify(attributes.emotionProfile),
                };
              } catch {
                return {};
              }
            },
          },
          emotionVector: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const data = element.getAttribute('data-emotion-vector');
              if (!data) return null;
              try {
                return JSON.parse(data) as EmotionScore[];
              } catch {
                return null;
              }
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.emotionVector) {
                return {};
              }
              try {
                return {
                  'data-emotion-vector': JSON.stringify(attributes.emotionVector),
                };
              } catch {
                return {};
              }
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      analyzeEmotions:
        (text: string) =>
        ({ chain }: { chain: () => Chain }) => {
          // This command will be handled by the UI component that calls GraphQL mutation
          // The actual analysis is done via GraphQL, then setEmotionProfile is called
          return chain();
        },
      setEmotionProfile:
        (profile: EmotionProfile) =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch?: ((tr: Transaction) => void) | undefined }) => {
          const { selection } = state;
          const { from, to } = selection;

          if (!dispatch) {
            return true;
          }

          // Apply to all node types (not just paragraph)
          state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            const attrs = node.attrs as Record<string, unknown>;
            tr.setNodeMarkup(pos, undefined, {
              ...attrs,
              emotionProfile: profile,
              emotionVector: profile.emotionVector,
            });
          });

          return true;
        },
      clearEmotionProfile:
        () =>
        ({ tr, state, dispatch }: { tr: Transaction; state: EditorState; dispatch?: ((tr: Transaction) => void) | undefined }) => {
          const { selection } = state;
          const { from, to } = selection;

          if (!dispatch) {
            return true;
          }

          // Apply to all node types (not just paragraph)
          state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            const attrs = node.attrs as Record<string, unknown>;
            tr.setNodeMarkup(pos, undefined, {
              ...attrs,
              emotionProfile: null,
              emotionVector: null,
            });
          });

          return true;
        },
    };
  },
});

