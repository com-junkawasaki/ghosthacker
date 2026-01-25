/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manga-editor-machine
 * 
 * XState machine for managing manga editor UI state
 */
import { setup, assign } from 'xstate';
import type { MangaEditorContext, MangaEditorEvent } from '@/types/mangaMachine';
import type { ToolType } from '@/lib/konva/tools';

export const mangaEditorMachine = setup({
  types: {
    context: {} as MangaEditorContext,
    events: {} as MangaEditorEvent,
  },
}).createMachine({
  id: 'mangaEditor',
  initial: 'idle',
  context: {
    selectedTool: 'select' as ToolType,
    zoom: 1.0,
    selectedNodeId: undefined,
    speechBubbles: [],
    stageRef: undefined,
  },
  states: {
    idle: {
      on: {
        SELECT_TOOL: {
          actions: assign({
            selectedTool: ({ event }) => event.tool,
          }),
        },
        SET_ZOOM: {
          actions: assign({
            zoom: ({ event }) => event.zoom,
          }),
        },
        SELECT_NODE: {
          actions: assign({
            selectedNodeId: ({ event }) => event.nodeId,
          }),
        },
        DESELECT_NODE: {
          actions: assign({
            selectedNodeId: () => undefined,
          }),
        },
        ADD_SPEECH_BUBBLE: {
          actions: assign({
            speechBubbles: ({ context, event }) => [...context.speechBubbles, event.bubble],
            selectedNodeId: ({ event }) => event.bubble.id,
          }),
        },
        UPDATE_SPEECH_BUBBLE: {
          actions: assign({
            speechBubbles: ({ context, event }) =>
              context.speechBubbles.map((bubble) =>
                bubble.id === event.bubbleId
                  ? { ...bubble, ...event.updates }
                  : bubble
              ),
          }),
        },
        DELETE_SPEECH_BUBBLE: {
          actions: assign({
            speechBubbles: ({ context, event }) =>
              context.speechBubbles.filter((bubble) => bubble.id !== event.bubbleId),
            selectedNodeId: ({ context, event }) =>
              context.selectedNodeId === event.bubbleId ? undefined : context.selectedNodeId,
          }),
        },
        SET_STAGE_REF: {
          actions: assign({
            stageRef: ({ event }) => event.stageRef,
          }),
        },
        EXPORT_START: {
          target: 'exporting',
        },
        SAVE_START: {
          target: 'saving',
        },
      },
    },
    editing: {
      on: {
        SELECT_TOOL: {
          actions: assign({
            selectedTool: ({ event }) => event.tool,
          }),
        },
        SET_ZOOM: {
          actions: assign({
            zoom: ({ event }) => event.zoom,
          }),
        },
        SELECT_NODE: {
          actions: assign({
            selectedNodeId: ({ event }) => event.nodeId,
          }),
        },
        DESELECT_NODE: {
          actions: assign({
            selectedNodeId: () => undefined,
          }),
        },
        ADD_SPEECH_BUBBLE: {
          actions: assign({
            speechBubbles: ({ context, event }) => [...context.speechBubbles, event.bubble],
            selectedNodeId: ({ event }) => event.bubble.id,
          }),
        },
        UPDATE_SPEECH_BUBBLE: {
          actions: assign({
            speechBubbles: ({ context, event }) =>
              context.speechBubbles.map((bubble) =>
                bubble.id === event.bubbleId
                  ? { ...bubble, ...event.updates }
                  : bubble
              ),
          }),
        },
        DELETE_SPEECH_BUBBLE: {
          actions: assign({
            speechBubbles: ({ context, event }) =>
              context.speechBubbles.filter((bubble) => bubble.id !== event.bubbleId),
            selectedNodeId: ({ context, event }) =>
              context.selectedNodeId === event.bubbleId ? undefined : context.selectedNodeId,
          }),
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
          target: 'editing',
        },
        EXPORT_ERROR: {
          target: 'error',
          actions: ({ event }) => {
            console.error('Export error:', event.error);
          },
        },
      },
    },
    saving: {
      on: {
        SAVE_COMPLETE: {
          target: 'editing',
        },
        SAVE_ERROR: {
          target: 'error',
          actions: ({ event }) => {
            console.error('Save error:', event.error);
          },
        },
      },
    },
    error: {
      on: {
        SELECT_TOOL: {
          target: 'editing',
          actions: assign({
            selectedTool: ({ event }) => event.tool,
          }),
        },
        DESELECT_NODE: {
          target: 'editing',
          actions: assign({
            selectedNodeId: () => undefined,
          }),
        },
      },
    },
  },
});

