/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:DataType
 * @id https://gftd.ai/datatype/manga-types
 * 
 * Manga editor type definitions with union types and ts-pattern support
 */
import { match } from 'ts-pattern';

// Union type for panel image data
export type PanelImageSource =
  | { type: 'url'; value: string }
  | { type: 'base64'; value: string }
  | { type: 'bytea'; value: string } // Base64 encoded bytea
  | { type: 'none' };

// Union type for data loading state
export type DataState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };

// Helper function to match data state
export const matchDataState = <T, R>(
  state: DataState<T>,
  handlers: {
    idle?: () => R;
    loading?: () => R;
    error?: (error: Error) => R;
    success?: (data: T) => R;
  }
): R => {
  return match(state)
    .with({ status: 'idle' }, () => handlers.idle?.() ?? (null as R))
    .with({ status: 'loading' }, () => handlers.loading?.() ?? (null as R))
    .with({ status: 'error' }, ({ error }) => handlers.error?.(error) ?? (null as R))
    .with({ status: 'success' }, ({ data }) => handlers.success?.(data) ?? (null as R))
    .exhaustive();
};

// Helper to convert panel image to union type
export const toPanelImageSource = (
  imageUrl?: string | null,
  imageBase64?: string | null,
  imageData?: string | null
): PanelImageSource => {
  if (imageData != null && imageData !== '') {
    return {
      type: 'bytea' as const,
      value: imageData,
    };
  }
  if (imageBase64 != null && imageBase64 !== '') {
    return {
      type: 'base64' as const,
      value: imageBase64,
    };
  }
  if (imageUrl != null && imageUrl !== '') {
    return {
      type: 'url' as const,
      value: imageUrl,
    };
  }
  return { type: 'none' as const };
};

export interface Dialogue {
  speaker: string;
  text: string;
}

export interface MangaProject {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MangaScript {
  id: string;
  projectId: string;
  title: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MangaPage {
  id: string;
  projectId: string;
  scriptId: string;
  pageId: string;
  pageType?: string;
  description?: string;
  pageNumber?: number;
  width: number;
  height: number;
  konvaStageJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MangaPanel {
  id: string;
  projectId: string;
  pageId: string;
  panelId: number;
  layout?: string;
  visual?: string;
  dialogue: Dialogue[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex: number;
  imageUrl?: string | null;
  imageBase64?: string | null;
  imageData?: string | null;
  panelData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Canvas-ready panel type
export interface CanvasPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageSource: PanelImageSource;
}

// Speech bubble type
export type SpeechBubbleType = 'speech' | 'thought' | 'shout';

export interface SpeechBubble {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  speaker?: string;
  bubbleType: SpeechBubbleType;
}

// Union type for debug state
export type DebugState = 
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: unknown; count?: number }
  | { status: 'idle' };

// Union type for panel selection state
export type PanelSelectionState =
  | { type: 'none' }
  | { type: 'selected'; panel: { id: string; order?: number; hideBorder?: boolean; ignoreNeighborPanels?: boolean } };

// Union type for bubble selection state
export type BubbleSelectionState =
  | { type: 'none' }
  | { type: 'selected'; bubble: SpeechBubble };

// Union type for canvas state
export type CanvasState =
  | { status: 'uninitialized' }
  | { 
      status: 'ready';
      panelsCount: number;
      selectedNodeId?: string;
      speechBubblesCount: number;
      stageWidth: number;
      stageHeight: number;
      zoom: number;
      selectedTool: string;
    };

// Union type for layer type
export type LayerType = 'image' | 'dialogue' | 'drawing' | 'shape' | 'text';

// Union type for layer visibility
export type LayerVisibility = { visible: true } | { visible: false };

// Union type for component load state
export type ComponentLoadState =
  | { status: 'loading' }
  | { status: 'loaded'; components: { Stage: any; Layer: any; PanelLayer: any; DrawingLayer: any; ShapeLayer: any; TextLayer: any; SelectionBox: any; SpeechBubble: any } }
  | { status: 'error'; error: Error };

// Helper function to match debug state
export const matchDebugState = <R>(
  state: DebugState,
  handlers: {
    loading?: () => R;
    error?: (error: Error) => R;
    success?: (data: unknown, count?: number) => R;
    idle?: () => R;
  }
): R => {
  return match(state)
    .with({ status: 'loading' }, () => handlers.loading?.() ?? (null as R))
    .with({ status: 'error' }, ({ error }) => handlers.error?.(error) ?? (null as R))
    .with({ status: 'success' }, ({ data, count }) => handlers.success?.(data, count) ?? (null as R))
    .with({ status: 'idle' }, () => handlers.idle?.() ?? (null as R))
    .exhaustive();
};

// Helper function to match panel selection state
export const matchPanelSelection = <R>(
  state: PanelSelectionState,
  handlers: {
    none?: () => R;
    selected?: (panel: { id: string; order?: number; hideBorder?: boolean; ignoreNeighborPanels?: boolean }) => R;
  }
): R => {
  return match(state)
    .with({ type: 'none' }, () => handlers.none?.() ?? (null as R))
    .with({ type: 'selected' }, ({ panel }) => handlers.selected?.(panel) ?? (null as R))
    .exhaustive();
};

// Helper function to match bubble selection state
export const matchBubbleSelection = <R>(
  state: BubbleSelectionState,
  handlers: {
    none?: () => R;
    selected?: (bubble: SpeechBubble) => R;
  }
): R => {
  return match(state)
    .with({ type: 'none' }, () => handlers.none?.() ?? (null as R))
    .with({ type: 'selected' }, ({ bubble }) => handlers.selected?.(bubble) ?? (null as R))
    .exhaustive();
};

// Helper function to match canvas state
export const matchCanvasState = <R>(
  state: CanvasState,
  handlers: {
    uninitialized?: () => R;
    ready?: (state: { panelsCount: number; selectedNodeId?: string; speechBubblesCount: number; stageWidth: number; stageHeight: number; zoom: number; selectedTool: string }) => R;
  }
): R => {
  return match(state)
    .with({ status: 'uninitialized' }, () => handlers.uninitialized?.() ?? (null as R))
    .with({ status: 'ready' }, (readyState) => handlers.ready?.(readyState) ?? (null as R))
    .exhaustive();
};

// Helper function to match component load state
export const matchComponentLoadState = <R>(
  state: ComponentLoadState,
  handlers: {
    loading?: () => R;
    loaded?: (components: { Stage: any; Layer: any; PanelLayer: any; DrawingLayer: any; ShapeLayer: any; TextLayer: any; SelectionBox: any; SpeechBubble: any }) => R;
    error?: (error: Error) => R;
  }
): R => {
  return match(state)
    .with({ status: 'loading' }, () => handlers.loading?.() ?? (null as R))
    .with({ status: 'loaded' }, ({ components }) => handlers.loaded?.(components) ?? (null as R))
    .with({ status: 'error' }, ({ error }) => handlers.error?.(error) ?? (null as R))
    .exhaustive();
};
