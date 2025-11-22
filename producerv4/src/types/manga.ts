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
  return match({ imageUrl, imageBase64, imageData })
    .with({ imageData: (v) => v != null && v !== '' }, ({ imageData }) => ({
      type: 'bytea' as const,
      value: imageData,
    }))
    .with({ imageBase64: (v) => v != null && v !== '' }, ({ imageBase64 }) => ({
      type: 'base64' as const,
      value: imageBase64,
    }))
    .with({ imageUrl: (v) => v != null && v !== '' }, ({ imageUrl }) => ({
      type: 'url' as const,
      value: imageUrl,
    }))
    .otherwise(() => ({ type: 'none' as const }));
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
