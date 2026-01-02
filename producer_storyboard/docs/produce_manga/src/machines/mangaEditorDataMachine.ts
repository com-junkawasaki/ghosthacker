/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manga-editor-data-machine
 * 
 * XState machine for managing manga editor data fetching state
 */
import { setup, assign } from 'xstate';
import type { MangaEditorDataContext, MangaEditorDataEvent } from '@/types/mangaMachine';

export const mangaEditorDataMachine = setup({
  types: {
    context: {} as MangaEditorDataContext,
    events: {} as MangaEditorDataEvent,
  },
}).createMachine({
  id: 'mangaEditorData',
  initial: 'idle',
  context: {
    projectId: '',
    project: undefined,
    scripts: undefined,
    selectedScriptId: undefined,
    pages: undefined,
    selectedPageId: undefined,
    panels: undefined,
    error: undefined,
  },
  states: {
    idle: {
      on: {
        LOAD_PROJECT: {
          target: 'loadingProject',
          actions: assign({
            projectId: ({ event }) => event.projectId,
          }),
        },
      },
    },
    loadingProject: {
      on: {
        PROJECT_LOADED: {
          target: 'loadingScripts',
          actions: assign({
            project: ({ event }) => event.project,
            error: () => undefined,
          }),
        },
        PROJECT_ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
      },
    },
    loadingScripts: {
      on: {
        SCRIPTS_LOADED: {
          target: 'scriptsLoaded',
          actions: assign({
            scripts: ({ event }) => event.scripts,
            selectedScriptId: ({ event }) => event.scripts.length > 0 ? event.scripts[0].id : undefined,
            error: () => undefined,
          }),
        },
        SCRIPTS_ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
      },
    },
    scriptsLoaded: {
      on: {
        SELECT_SCRIPT: {
          target: 'loadingPages',
          actions: assign({
            selectedScriptId: ({ event }) => event.scriptId,
          }),
        },
        LOAD_PAGES: {
          target: 'loadingPages',
        },
      },
    },
    loadingPages: {
      on: {
        PAGES_LOADED: {
          target: 'pagesLoaded',
          actions: assign({
            pages: ({ event }) => event.pages,
            selectedPageId: ({ event }) => event.pages.length > 0 ? event.pages[0].id : undefined,
            error: () => undefined,
          }),
        },
        PAGES_ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
      },
    },
    pagesLoaded: {
      on: {
        SELECT_PAGE: {
          target: 'loadingPanels',
          actions: assign({
            selectedPageId: ({ event }) => event.pageId,
          }),
        },
        LOAD_PANELS: {
          target: 'loadingPanels',
        },
      },
    },
    loadingPanels: {
      on: {
        PANELS_LOADED: {
          target: 'ready',
          actions: assign({
            panels: ({ event }) => event.panels,
            error: () => undefined,
          }),
        },
        PANELS_ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
      },
    },
    ready: {
      on: {
        SELECT_PAGE: {
          target: 'loadingPanels',
          actions: assign({
            selectedPageId: ({ event }) => event.pageId,
            panels: () => undefined,
          }),
        },
        SELECT_SCRIPT: {
          target: 'loadingPages',
          actions: assign({
            selectedScriptId: ({ event }) => event.scriptId,
            pages: () => undefined,
            selectedPageId: () => undefined,
            panels: () => undefined,
          }),
        },
      },
    },
    error: {
      on: {
        LOAD_PROJECT: {
          target: 'loadingProject',
          actions: assign({
            projectId: ({ event }) => event.projectId,
            error: () => undefined,
          }),
        },
      },
    },
  },
});

