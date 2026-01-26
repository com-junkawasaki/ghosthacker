/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:DataType
 * @id https://gftd.ai/datatype/manga-machine-types
 * 
 * XState machine type definitions for manga editor
 */
import type { MangaProject, MangaScript, MangaPage, MangaPanel, SpeechBubble } from './manga';
import type { ToolType } from '@/lib/konva/tools';
import type Konva from 'konva';

type KonvaStageType = Konva.Stage;

// Data machine context
export interface MangaEditorDataContext {
  projectId: string;
  project?: MangaProject | undefined;
  scripts?: MangaScript[] | undefined;
  selectedScriptId?: string | undefined;
  pages?: MangaPage[] | undefined;
  selectedPageId?: string | undefined;
  panels?: MangaPanel[] | undefined;
  error?: Error | undefined;
}

// Data machine events
export type MangaEditorDataEvent =
  | { type: 'LOAD_PROJECT'; projectId: string }
  | { type: 'PROJECT_LOADED'; project: MangaProject }
  | { type: 'PROJECT_ERROR'; error: Error }
  | { type: 'LOAD_SCRIPTS' }
  | { type: 'SCRIPTS_LOADED'; scripts: MangaScript[] }
  | { type: 'SCRIPTS_ERROR'; error: Error }
  | { type: 'SELECT_SCRIPT'; scriptId: string }
  | { type: 'LOAD_PAGES' }
  | { type: 'PAGES_LOADED'; pages: MangaPage[] }
  | { type: 'PAGES_ERROR'; error: Error }
  | { type: 'SELECT_PAGE'; pageId: string }
  | { type: 'LOAD_PANELS' }
  | { type: 'PANELS_LOADED'; panels: MangaPanel[] }
  | { type: 'PANELS_ERROR'; error: Error };

// Konva drawing state
export interface KonvaDrawingState {
  isDrawing: boolean;
  currentLineId?: string | undefined;
  currentPoints: number[];
  color: string;
  strokeWidth: number;
}

// Konva shape state
export interface KonvaShapeState {
  isDrawing: boolean;
  currentShapeId?: string | undefined;
  shapeType?: 'rect' | 'circle' | undefined;
  startPos?: { x: number; y: number } | undefined;
  currentPos?: { x: number; y: number } | undefined;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

// Konva text state
export interface KonvaTextState {
  isEditing: boolean;
  currentTextId?: string | undefined;
  position?: { x: number; y: number } | undefined;
  fontSize: number;
  fontFamily: string;
  fillColor: string;
}

// Editor machine context
export interface MangaEditorContext {
  selectedTool: ToolType;
  zoom: number;
  selectedNodeId?: string | undefined;
  speechBubbles: SpeechBubble[];
  stageRef?: KonvaStageType | undefined;
  // Konva operation states
  drawing: KonvaDrawingState;
  shape: KonvaShapeState;
  text: KonvaTextState;
  // Stage state
  stageJson?: Record<string, unknown> | undefined;
}

// Editor machine events
export type MangaEditorEvent =
  | { type: 'SELECT_TOOL'; tool: ToolType }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'DESELECT_NODE' }
  | { type: 'ADD_SPEECH_BUBBLE'; bubble: SpeechBubble }
  | { type: 'UPDATE_SPEECH_BUBBLE'; bubbleId: string; updates: Partial<SpeechBubble> }
  | { type: 'DELETE_SPEECH_BUBBLE'; bubbleId: string }
  | { type: 'EXPORT_START'; format: 'png' | 'jpeg' | 'pdf' }
  | { type: 'EXPORT_COMPLETE' }
  | { type: 'EXPORT_ERROR'; error: Error }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_COMPLETE' }
  | { type: 'SAVE_ERROR'; error: Error }
  | { type: 'SET_STAGE_REF'; stageRef: KonvaStageType }
  // Konva drawing events
  | { type: 'KONVA_DRAWING_START'; x: number; y: number; color?: string; strokeWidth?: number }
  | { type: 'KONVA_DRAWING_MOVE'; x: number; y: number }
  | { type: 'KONVA_DRAWING_COMPLETE'; lineId: string; points: number[] }
  | { type: 'KONVA_DRAWING_CANCEL' }
  // Konva shape events
  | { type: 'KONVA_SHAPE_START'; x: number; y: number; shapeType: 'rect' | 'circle'; strokeColor?: string; fillColor?: string; strokeWidth?: number }
  | { type: 'KONVA_SHAPE_MOVE'; x: number; y: number }
  | { type: 'KONVA_SHAPE_COMPLETE'; shapeId: string; shape: { type: 'rect' | 'circle'; x: number; y: number; width?: number; height?: number; radius?: number } }
  | { type: 'KONVA_SHAPE_CANCEL' }
  // Konva text events
  | { type: 'KONVA_TEXT_START'; x: number; y: number; fontSize?: number; fontFamily?: string; fillColor?: string }
  | { type: 'KONVA_TEXT_UPDATE'; textId: string; text: string }
  | { type: 'KONVA_TEXT_COMPLETE'; textId: string }
  | { type: 'KONVA_TEXT_CANCEL' }
  // Konva stage events
  | { type: 'KONVA_STAGE_UPDATE'; stageJson: Record<string, unknown> }
  | { type: 'KONVA_STAGE_CLICK'; x: number; y: number; targetId?: string };

// Page machine context (combines data and editor contexts)
export interface MangaEditorPageContext {
  data: MangaEditorDataContext;
  editor: MangaEditorContext;
}

// Page machine events (combines data and editor events)
export type MangaEditorPageEvent = MangaEditorDataEvent | MangaEditorEvent;

