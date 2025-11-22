/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/manga-types
 * 
 * TypeScript type definitions for manga editor
 */

export interface MangaProject {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MangaStory {
  id: string;
  projectId: string;
  storyId: string;
  title: string;
  temporal?: string;
  description?: string;
  theme: string[];
  storyData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MangaScene {
  id: string;
  projectId: string;
  storyId: string;
  sceneId: string;
  name: string;
  content?: string;
  participants: string[];
  action: string[];
  sceneData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MangaScript {
  id: string;
  projectId: string;
  scriptId: string;
  title: string;
  pageCount?: number;
  scriptData: Record<string, unknown>;
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
  imageUrl?: string;
  imageBase64?: string;
  panelData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Dialogue {
  speaker: string;
  text: string;
}

export interface Layer {
  id: string;
  panelId: string;
  layerName: string;
  layerType: string;
  zIndex: number;
  visible: boolean;
  opacity: number;
  konvaData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SpeechBubble {
  id: string;
  panelId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  speaker?: string;
  bubbleType: string;
  fontSize: number;
  fontFamily: string;
  konvaNodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModel {
  id: string;
  provider: string;
  modelId: string;
  modelName: string;
  modelType: string;
  previewImageUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedImage {
  id: string;
  projectId: string;
  panelId?: string;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  imageBase64?: string;
  provider: string;
  model: string;
  modelId?: string;
  createdAt: string;
}

