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
  project?: MangaProject;
  scripts?: MangaScript[];
  selectedScriptId?: string;
  pages?: MangaPage[];
  selectedPageId?: string;
  panels?: MangaPanel[];
  error?: Error;
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

// Editor machine context
export interface MangaEditorContext {
  selectedTool: ToolType;
  zoom: number;
  selectedNodeId?: string;
  speechBubbles: SpeechBubble[];
  stageRef?: KonvaStageType;
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
  | { type: 'SET_STAGE_REF'; stageRef: KonvaStageType };

// Page machine context (combines data and editor contexts)
export interface MangaEditorPageContext {
  data: MangaEditorDataContext;
  editor: MangaEditorContext;
}

// Page machine events (combines data and editor events)
export type MangaEditorPageEvent = MangaEditorDataEvent | MangaEditorEvent;

