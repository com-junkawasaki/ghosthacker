/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/ai-content-generation
 * 
 * AI Content Generation Extension for Tiptap
 * Based on Tiptap AI Toolkit editDocument primitive
 */
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { extractEditorContext, extractContextAroundCursor } from '@/lib/editor/contextExtractor';
import { buildMultiAgentContext } from '@/lib/ai/multiAgentContext';

export interface AIContentGenerationExtensionOptions {
  HTMLAttributes: Record<string, unknown>;
  onGenerateStart?: () => void;
  onGenerateComplete?: (text: string) => void;
  onGenerateError?: (error: Error) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiContentGeneration: {
      /**
       * Generate content from selection or cursor position
       */
      generateContent: (options?: {
        prompt?: string;
        characterId?: string;
        sceneId?: string;
        povId?: string;
        useContext?: boolean;
      }) => ReturnType;
      /**
       * Generate content with context from JSONLD nodes
       */
      generateWithContext: (options: {
        prompt: string;
        characterId?: string;
        sceneId?: string;
        povId?: string;
        context?: string;
      }) => ReturnType;
      /**
       * Insert generated content at cursor position
       */
      insertGeneratedContent: (text: string) => ReturnType;
    };
  }
}

export const AIContentGenerationExtension = Extension.create<AIContentGenerationExtensionOptions>({
  name: 'aiContentGeneration',

  addOptions() {
    return {
      HTMLAttributes: {},
      onGenerateStart: undefined,
      onGenerateComplete: undefined,
      onGenerateError: undefined,
    };
  },

  addCommands() {
    return {
      generateContent:
        (options = {}) =>
        ({ editor, chain }: { editor: Editor; chain: any }) => {
          const {
            prompt = 'Continue the story',
            characterId,
            sceneId,
            povId,
            useContext = true,
          } = options;

          // Call onGenerateStart callback
          if (this.options.onGenerateStart) {
            this.options.onGenerateStart();
          }

          // Extract context from editor
          let context = '';
          if (useContext) {
            const editorContext = editor.state.selection.empty
              ? extractContextAroundCursor(editor, 200)
              : extractEditorContext(editor);

            // Build multi-agent context
            const multiAgentContext = buildMultiAgentContext(editor, {
              characterIds: characterId ? [characterId] : undefined,
              sceneId,
              povId,
            });

            // Build context string
            const contextParts: string[] = [];

            if (multiAgentContext.scene) {
              contextParts.push(`Scene: ${multiAgentContext.scene.name}`);
              contextParts.push(
                `Characters present: ${multiAgentContext.scene.characters.map((c) => c.name).join(', ')}`
              );
            }

            if (multiAgentContext.characters.length > 0) {
              multiAgentContext.characters.forEach((char) => {
                contextParts.push(`Character: ${char.name}`);
                if (char.dialogue.length > 0) {
                  contextParts.push(`Previous dialogue: ${char.dialogue.slice(-3).join(' ')}`);
                }
              });
            }

            if (multiAgentContext.narrator) {
              contextParts.push(`Narrator: ${multiAgentContext.narrator.name}`);
              if (multiAgentContext.narrator.perspectiveType) {
                contextParts.push(`Perspective: ${multiAgentContext.narrator.perspectiveType}`);
              }
            }

            if (editorContext.selectedText) {
              contextParts.push(`Selected text: ${editorContext.selectedText.substring(0, 500)}`);
            }

            context = contextParts.join('\n');
          }

          // Call generateWithContext command
          return chain()
            .focus()
            .generateWithContext({
              prompt,
              characterId,
              sceneId,
              povId,
              context,
            })
            .run();
        },
      generateWithContext:
        (options) =>
        async ({ editor }: { editor: Editor }) => {
          const { prompt, characterId, sceneId, povId, context } = options;

          try {
            // Call GraphQL mutation (this will be handled by UI component)
            // For now, we'll just insert a placeholder
            // The actual API call will be made by the UI component that uses this extension

            // This is a placeholder - the actual generation will be handled by the UI component
            // that calls the GraphQL mutation and then uses insertGeneratedContent

            return true;
          } catch (error) {
            if (this.options.onGenerateError) {
              this.options.onGenerateError(error as Error);
            }
            return false;
          }
        },
      insertGeneratedContent:
        (text: string) =>
        ({ editor, chain }: { editor: Editor; chain: any }) => {
          // Call onGenerateComplete callback
          if (this.options.onGenerateComplete) {
            this.options.onGenerateComplete(text);
          }

          // Insert generated text at cursor position
          return chain()
            .focus()
            .insertContent(text)
            .run();
        },
    };
  },
});

