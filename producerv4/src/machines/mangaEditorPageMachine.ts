/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manga-editor-page-machine
 * 
 * XState machine for managing the entire manga editor page state
 * Combines data fetching and editor UI state machines
 */
import { setup, assign } from 'xstate';
import type { MangaEditorPageContext, MangaEditorPageEvent } from '@/types/mangaMachine';

export const mangaEditorPageMachine = setup({
  types: {
    context: {} as MangaEditorPageContext,
    events: {} as MangaEditorPageEvent,
  },
}).createMachine({
  id: 'mangaEditorPage',
  initial: 'initializing',
  context: {
    data: {
      projectId: '',
      project: undefined,
      scripts: undefined,
      selectedScriptId: undefined,
      pages: undefined,
      selectedPageId: undefined,
      panels: undefined,
      error: undefined,
    },
    editor: {
      selectedTool: 'select',
      zoom: 1.0,
      selectedNodeId: undefined,
      speechBubbles: [],
      stageRef: undefined,
    },
  },
  states: {
    initializing: {
      on: {
        PROJECT_LOADED: {
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              project: event.project,
            },
          })),
        },
        SCRIPTS_LOADED: {
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              scripts: event.scripts,
              selectedScriptId: event.scripts.length > 0 ? event.scripts[0].id : undefined,
            },
          })),
        },
        PAGES_LOADED: {
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              pages: event.pages,
              selectedPageId: event.pages.length > 0 ? event.pages[0].id : undefined,
            },
          })),
        },
        PANELS_LOADED: {
          target: 'ready',
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              panels: event.panels,
            },
          })),
        },
      },
    },
    ready: {
      on: {
        // Data events
        SELECT_PAGE: {
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              selectedPageId: event.pageId,
              panels: undefined,
            },
          })),
        },
        SELECT_SCRIPT: {
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              selectedScriptId: event.scriptId,
              pages: undefined,
              selectedPageId: undefined,
              panels: undefined,
            },
          })),
        },
        PANELS_LOADED: {
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              panels: event.panels,
            },
          })),
        },
        // Editor events
        SELECT_TOOL: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              selectedTool: event.tool,
            },
          })),
        },
        SET_ZOOM: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              zoom: event.zoom,
            },
          })),
        },
        SELECT_NODE: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              selectedNodeId: event.nodeId,
            },
          })),
        },
        DESELECT_NODE: {
          actions: assign(({ context }) => ({
            ...context,
            editor: {
              ...context.editor,
              selectedNodeId: undefined,
            },
          })),
        },
        ADD_SPEECH_BUBBLE: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              speechBubbles: [...context.editor.speechBubbles, event.bubble],
              selectedNodeId: event.bubble.id,
            },
          })),
        },
        UPDATE_SPEECH_BUBBLE: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              speechBubbles: context.editor.speechBubbles.map((bubble) =>
                bubble.id === event.bubbleId
                  ? { ...bubble, ...event.updates }
                  : bubble
              ),
            },
          })),
        },
        DELETE_SPEECH_BUBBLE: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              speechBubbles: context.editor.speechBubbles.filter(
                (bubble) => bubble.id !== event.bubbleId
              ),
              selectedNodeId: context.editor.selectedNodeId === event.bubbleId
                ? undefined
                : context.editor.selectedNodeId,
            },
          })),
        },
        SET_STAGE_REF: {
          actions: assign(({ event, context }) => ({
            ...context,
            editor: {
              ...context.editor,
              stageRef: event.stageRef,
            },
          })),
        },
        EXPORT_START: {
          target: 'exporting',
        },
        SAVE_START: {
          target: 'saving',
        },
      },
    },
    exporting: {
      on: {
        EXPORT_COMPLETE: {
          target: 'ready',
        },
        EXPORT_ERROR: {
          target: 'ready',
          actions: ({ event }) => {
            console.error('Export error:', event.error);
          },
        },
      },
    },
    saving: {
      on: {
        SAVE_COMPLETE: {
          target: 'ready',
        },
        SAVE_ERROR: {
          target: 'ready',
          actions: ({ event }) => {
            console.error('Save error:', event.error);
          },
        },
      },
    },
    error: {
      on: {
        LOAD_PROJECT: {
          target: 'initializing',
          actions: assign(({ event, context }) => ({
            ...context,
            data: {
              ...context.data,
              projectId: event.projectId,
              error: undefined,
            },
          })),
        },
      },
    },
  },
});

