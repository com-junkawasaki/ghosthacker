/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/use-manga-editor-machine
 * 
 * Custom hook for using the manga editor page machine
 */
import { useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { mangaEditorPageMachine } from '@/machines/mangaEditorPageMachine';
import type { MangaEditorPageEvent } from '@/types/mangaMachine';
import type { ToolType } from '@/lib/konva/tools';
import type { SpeechBubble } from '@/types/manga';
import type Konva from 'konva';
type KonvaStageType = Konva.Stage;

// XState inspect is disabled due to compatibility issues with XState v5
// @xstate/inspect v0.8.0 has known issues accessing 'client' property
// TODO: Re-enable when @xstate/inspect is updated for XState v5 compatibility

export function useMangaEditorMachine(projectId: string) {
  const [snapshot, send] = useMachine(mangaEditorPageMachine, {
    input: {
      projectId,
    },
    // Inspect disabled due to XState v5 compatibility issues
  });

  // Helper functions for common actions - memoized to prevent infinite loops
  const actions = useMemo(() => ({
    loadProject: (projectId: string) => {
      send({ type: 'LOAD_PROJECT', projectId } as MangaEditorPageEvent);
    },
    selectTool: (tool: ToolType) => {
      send({ type: 'SELECT_TOOL', tool } as MangaEditorPageEvent);
    },
    setZoom: (zoom: number) => {
      send({ type: 'SET_ZOOM', zoom } as MangaEditorPageEvent);
    },
    selectNode: (nodeId: string) => {
      send({ type: 'SELECT_NODE', nodeId } as MangaEditorPageEvent);
    },
    deselectNode: () => {
      send({ type: 'DESELECT_NODE' } as MangaEditorPageEvent);
    },
    addSpeechBubble: (bubble: SpeechBubble) => {
      send({ type: 'ADD_SPEECH_BUBBLE', bubble } as MangaEditorPageEvent);
    },
    updateSpeechBubble: (bubbleId: string, updates: Partial<SpeechBubble>) => {
      send({ type: 'UPDATE_SPEECH_BUBBLE', bubbleId, updates } as MangaEditorPageEvent);
    },
    deleteSpeechBubble: (bubbleId: string) => {
      send({ type: 'DELETE_SPEECH_BUBBLE', bubbleId } as MangaEditorPageEvent);
    },
    selectPage: (pageId: string) => {
      send({ type: 'SELECT_PAGE', pageId } as MangaEditorPageEvent);
    },
    selectScript: (scriptId: string) => {
      send({ type: 'SELECT_SCRIPT', scriptId } as MangaEditorPageEvent);
    },
    setStageRef: (stageRef: KonvaStageType) => {
      send({ type: 'SET_STAGE_REF', stageRef } as MangaEditorPageEvent);
    },
    startExport: (format: 'png' | 'jpeg' | 'pdf') => {
      send({ type: 'EXPORT_START', format } as MangaEditorPageEvent);
    },
    completeExport: () => {
      send({ type: 'EXPORT_COMPLETE' } as MangaEditorPageEvent);
    },
    errorExport: (error: Error) => {
      send({ type: 'EXPORT_ERROR', error } as MangaEditorPageEvent);
    },
    startSave: () => {
      send({ type: 'SAVE_START' } as MangaEditorPageEvent);
    },
    completeSave: () => {
      send({ type: 'SAVE_COMPLETE' } as MangaEditorPageEvent);
    },
    errorSave: (error: Error) => {
      send({ type: 'SAVE_ERROR', error } as MangaEditorPageEvent);
    },
    // Konva drawing actions
    startDrawing: (x: number, y: number, color?: string, strokeWidth?: number) => {
      send({ type: 'KONVA_DRAWING_START', x, y, color, strokeWidth } as MangaEditorPageEvent);
    },
    moveDrawing: (x: number, y: number) => {
      send({ type: 'KONVA_DRAWING_MOVE', x, y } as MangaEditorPageEvent);
    },
    completeDrawing: (lineId: string, points: number[]) => {
      send({ type: 'KONVA_DRAWING_COMPLETE', lineId, points } as MangaEditorPageEvent);
    },
    cancelDrawing: () => {
      send({ type: 'KONVA_DRAWING_CANCEL' } as MangaEditorPageEvent);
    },
    // Konva shape actions
    startShape: (x: number, y: number, shapeType: 'rect' | 'circle', strokeColor?: string, fillColor?: string, strokeWidth?: number) => {
      send({ type: 'KONVA_SHAPE_START', x, y, shapeType, strokeColor, fillColor, strokeWidth } as MangaEditorPageEvent);
    },
    moveShape: (x: number, y: number) => {
      send({ type: 'KONVA_SHAPE_MOVE', x, y } as MangaEditorPageEvent);
    },
    completeShape: (shapeId: string, shape: { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number }) => {
      send({ type: 'KONVA_SHAPE_COMPLETE', shapeId, shape } as MangaEditorPageEvent);
    },
    cancelShape: () => {
      send({ type: 'KONVA_SHAPE_CANCEL' } as MangaEditorPageEvent);
    },
    // Konva text actions
    startText: (x: number, y: number, fontSize?: number, fontFamily?: string, fillColor?: string) => {
      send({ type: 'KONVA_TEXT_START', x, y, fontSize, fontFamily, fillColor } as MangaEditorPageEvent);
    },
    updateText: (textId: string, text: string) => {
      send({ type: 'KONVA_TEXT_UPDATE', textId, text } as MangaEditorPageEvent);
    },
    completeText: (textId: string) => {
      send({ type: 'KONVA_TEXT_COMPLETE', textId } as MangaEditorPageEvent);
    },
    cancelText: () => {
      send({ type: 'KONVA_TEXT_CANCEL' } as MangaEditorPageEvent);
    },
    // Konva stage actions
    updateStage: (stageJson: Record<string, unknown>) => {
      send({ type: 'KONVA_STAGE_UPDATE', stageJson } as MangaEditorPageEvent);
    },
    clickStage: (x: number, y: number, targetId?: string) => {
      send({ type: 'KONVA_STAGE_CLICK', x, y, targetId } as MangaEditorPageEvent);
    },
  }), [send]);

  return {
    snapshot,
    send,
    actions,
    // Convenience accessors
    state: snapshot.value,
    context: snapshot.context,
    data: snapshot.context.data,
    editor: snapshot.context.editor,
    // Konva state accessors
    drawing: snapshot.context.editor.drawing,
    shape: snapshot.context.editor.shape,
    text: snapshot.context.editor.text,
  };
}

