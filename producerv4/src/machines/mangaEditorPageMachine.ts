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
    input: {} as { projectId: string },
  },
}).createMachine({
  id: 'mangaEditorPage',
  initial: 'initializing',
  context: ({ input }) => ({
    data: {
      projectId: input?.projectId || '',
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
      drawing: {
        isDrawing: false,
        currentLineId: undefined,
        currentPoints: [],
        color: '#000000',
        strokeWidth: 2,
      },
      shape: {
        isDrawing: false,
        currentShapeId: undefined,
        shapeType: undefined,
        startPos: undefined,
        currentPos: undefined,
        strokeColor: '#000000',
        fillColor: 'transparent',
        strokeWidth: 2,
      },
      text: {
        isEditing: false,
        currentTextId: undefined,
        position: undefined,
        fontSize: 16,
        fontFamily: 'sans-serif',
        fillColor: '#000000',
      },
      stageJson: undefined,
    },
  }),
  states: {
    initializing: {
      on: {
        PROJECT_LOADED: {
          actions: assign(({ event, context }) => ({
            data: {
              ...context.data,
              project: event.project,
            },
          })),
        },
        SCRIPTS_LOADED: {
          actions: assign(({ event, context }) => ({
            data: {
              ...context.data,
              scripts: event.scripts,
              selectedScriptId: event.scripts.length > 0 ? event.scripts[0].id : (undefined as string | undefined),
            },
          })),
        },
        PAGES_LOADED: {
          actions: assign(({ event, context }) => ({
            data: {
              ...context.data,
              pages: event.pages,
              selectedPageId: event.pages.length > 0 ? event.pages[0].id : (undefined as string | undefined),
            },
          })),
        },
        PANELS_LOADED: {
          target: 'ready',
          actions: assign(({ event, context }) => ({
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
            data: {
              ...context.data,
              selectedPageId: event.pageId,
              panels: undefined as MangaPanel[] | undefined,
            },
          })),
        },
        SELECT_SCRIPT: {
          actions: assign(({ event, context }) => ({
            data: {
              ...context.data,
              selectedScriptId: event.scriptId,
              pages: undefined as MangaPage[] | undefined,
              selectedPageId: undefined as string | undefined,
              panels: undefined as MangaPanel[] | undefined,
            },
          })),
        },
        PANELS_LOADED: {
          actions: assign(({ event, context }) => ({
            data: {
              ...context.data,
              panels: event.panels,
            },
          })),
        },
        // Editor events
        SELECT_TOOL: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              selectedTool: event.tool,
            },
          })),
        },
        SET_ZOOM: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              zoom: event.zoom,
            },
          })),
        },
        SELECT_NODE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              selectedNodeId: event.nodeId,
            },
          })),
        },
        DESELECT_NODE: {
          actions: assign(({ context }) => ({
            editor: {
              ...context.editor,
              selectedNodeId: undefined as string | undefined,
            },
          })),
        },
        ADD_SPEECH_BUBBLE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              speechBubbles: [...context.editor.speechBubbles, event.bubble],
              selectedNodeId: event.bubble.id,
            },
          })),
        },
        UPDATE_SPEECH_BUBBLE: {
          actions: assign(({ event, context }) => ({
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
            editor: {
              ...context.editor,
              speechBubbles: context.editor.speechBubbles.filter(
                (bubble) => bubble.id !== event.bubbleId
              ),
              selectedNodeId: context.editor.selectedNodeId === event.bubbleId
                ? (undefined as string | undefined)
                : context.editor.selectedNodeId,
            },
          })),
        },
        SET_STAGE_REF: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              stageRef: event.stageRef,
            },
          })),
        },
        // Konva drawing events
        KONVA_DRAWING_START: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              drawing: {
                isDrawing: true,
                currentLineId: undefined,
                currentPoints: [event.x, event.y],
                color: event.color ?? context.editor.drawing.color,
                strokeWidth: event.strokeWidth ?? context.editor.drawing.strokeWidth,
              },
            },
          })),
        },
        KONVA_DRAWING_MOVE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              drawing: {
                ...context.editor.drawing,
                currentPoints: [...context.editor.drawing.currentPoints, event.x, event.y],
              },
            },
          })),
        },
        KONVA_DRAWING_COMPLETE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              drawing: {
                isDrawing: false,
                currentLineId: undefined,
                currentPoints: [],
                color: context.editor.drawing.color,
                strokeWidth: context.editor.drawing.strokeWidth,
              },
            },
          })),
        },
        KONVA_DRAWING_CANCEL: {
          actions: assign(({ context }) => ({
            editor: {
              ...context.editor,
              drawing: {
                isDrawing: false,
                currentLineId: undefined,
                currentPoints: [],
                color: context.editor.drawing.color,
                strokeWidth: context.editor.drawing.strokeWidth,
              },
            },
          })),
        },
        // Konva shape events
        KONVA_SHAPE_START: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              shape: {
                isDrawing: true,
                currentShapeId: undefined,
                shapeType: event.shapeType,
                startPos: { x: event.x, y: event.y },
                currentPos: { x: event.x, y: event.y },
                strokeColor: event.strokeColor ?? context.editor.shape.strokeColor,
                fillColor: event.fillColor ?? context.editor.shape.fillColor,
                strokeWidth: event.strokeWidth ?? context.editor.shape.strokeWidth,
              },
            },
          })),
        },
        KONVA_SHAPE_MOVE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              shape: {
                ...context.editor.shape,
                currentPos: { x: event.x, y: event.y },
              },
            },
          })),
        },
        KONVA_SHAPE_COMPLETE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              shape: {
                isDrawing: false,
                currentShapeId: undefined,
                shapeType: undefined,
                startPos: undefined,
                currentPos: undefined,
                strokeColor: context.editor.shape.strokeColor,
                fillColor: context.editor.shape.fillColor,
                strokeWidth: context.editor.shape.strokeWidth,
              },
            },
          })),
        },
        KONVA_SHAPE_CANCEL: {
          actions: assign(({ context }) => ({
            editor: {
              ...context.editor,
              shape: {
                isDrawing: false,
                currentShapeId: undefined,
                shapeType: undefined,
                startPos: undefined,
                currentPos: undefined,
                strokeColor: context.editor.shape.strokeColor,
                fillColor: context.editor.shape.fillColor,
                strokeWidth: context.editor.shape.strokeWidth,
              },
            },
          })),
        },
        // Konva text events
        KONVA_TEXT_START: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              text: {
                isEditing: true,
                currentTextId: undefined,
                position: { x: event.x, y: event.y },
                fontSize: event.fontSize ?? context.editor.text.fontSize,
                fontFamily: event.fontFamily ?? context.editor.text.fontFamily,
                fillColor: event.fillColor ?? context.editor.text.fillColor,
              },
            },
          })),
        },
        KONVA_TEXT_UPDATE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              text: {
                ...context.editor.text,
                currentTextId: event.textId,
              },
            },
          })),
        },
        KONVA_TEXT_COMPLETE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              text: {
                isEditing: false,
                currentTextId: undefined,
                position: undefined,
                fontSize: context.editor.text.fontSize,
                fontFamily: context.editor.text.fontFamily,
                fillColor: context.editor.text.fillColor,
              },
            },
          })),
        },
        KONVA_TEXT_CANCEL: {
          actions: assign(({ context }) => ({
            editor: {
              ...context.editor,
              text: {
                isEditing: false,
                currentTextId: undefined,
                position: undefined,
                fontSize: context.editor.text.fontSize,
                fontFamily: context.editor.text.fontFamily,
                fillColor: context.editor.text.fillColor,
              },
            },
          })),
        },
        // Konva stage events
        KONVA_STAGE_UPDATE: {
          actions: assign(({ event, context }) => ({
            editor: {
              ...context.editor,
              stageJson: event.stageJson,
            },
          })),
        },
        KONVA_STAGE_CLICK: {
          actions: assign(({ event, context }) => {
            // If clicking on empty area, deselect
            if (!event.targetId) {
              return {
                editor: {
                  ...context.editor,
                  selectedNodeId: undefined as string | undefined,
                },
              };
            }
            // Otherwise, select the clicked node
            return {
              editor: {
                ...context.editor,
                selectedNodeId: event.targetId,
              },
            };
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
            data: {
              ...context.data,
              projectId: event.projectId,
              error: undefined as Error | undefined,
            },
          })),
        },
      },
    },
  },
});

