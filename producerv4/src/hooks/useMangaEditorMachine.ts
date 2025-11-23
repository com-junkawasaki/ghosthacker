/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/use-manga-editor-machine
 * 
 * Custom hook for using the manga editor page machine
 */
import { useMachine } from '@xstate/react';
import { mangaEditorPageMachine } from '@/machines/mangaEditorPageMachine';
import type { MangaEditorPageEvent } from '@/types/mangaMachine';

export function useMangaEditorMachine(projectId: string) {
  const [snapshot, send] = useMachine(mangaEditorPageMachine, {
    input: {
      data: {
        projectId,
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
  });

  // Helper functions for common actions
  const actions = {
    loadProject: (projectId: string) => {
      send({ type: 'LOAD_PROJECT', projectId });
    },
    selectTool: (tool: Parameters<MangaEditorPageEvent & { type: 'SELECT_TOOL' }>[0]['tool']) => {
      send({ type: 'SELECT_TOOL', tool });
    },
    setZoom: (zoom: number) => {
      send({ type: 'SET_ZOOM', zoom });
    },
    selectNode: (nodeId: string) => {
      send({ type: 'SELECT_NODE', nodeId });
    },
    deselectNode: () => {
      send({ type: 'DESELECT_NODE' });
    },
    addSpeechBubble: (bubble: Parameters<MangaEditorPageEvent & { type: 'ADD_SPEECH_BUBBLE' }>[0]['bubble']) => {
      send({ type: 'ADD_SPEECH_BUBBLE', bubble });
    },
    updateSpeechBubble: (bubbleId: string, updates: Parameters<MangaEditorPageEvent & { type: 'UPDATE_SPEECH_BUBBLE' }>[0]['updates']) => {
      send({ type: 'UPDATE_SPEECH_BUBBLE', bubbleId, updates });
    },
    deleteSpeechBubble: (bubbleId: string) => {
      send({ type: 'DELETE_SPEECH_BUBBLE', bubbleId });
    },
    selectPage: (pageId: string) => {
      send({ type: 'SELECT_PAGE', pageId });
    },
    selectScript: (scriptId: string) => {
      send({ type: 'SELECT_SCRIPT', scriptId });
    },
    setStageRef: (stageRef: Parameters<MangaEditorPageEvent & { type: 'SET_STAGE_REF' }>[0]['stageRef']) => {
      send({ type: 'SET_STAGE_REF', stageRef });
    },
    startExport: (format: 'png' | 'jpeg' | 'pdf') => {
      send({ type: 'EXPORT_START', format });
    },
    completeExport: () => {
      send({ type: 'EXPORT_COMPLETE' });
    },
    errorExport: (error: Error) => {
      send({ type: 'EXPORT_ERROR', error });
    },
    startSave: () => {
      send({ type: 'SAVE_START' });
    },
    completeSave: () => {
      send({ type: 'SAVE_COMPLETE' });
    },
    errorSave: (error: Error) => {
      send({ type: 'SAVE_ERROR', error });
    },
  };

  return {
    snapshot,
    send,
    actions,
    // Convenience accessors
    state: snapshot.value,
    context: snapshot.context,
    data: snapshot.context.data,
    editor: snapshot.context.editor,
  };
}

