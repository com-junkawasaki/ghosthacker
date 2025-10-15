import { object, string, number, boolean, array } from 'valibot';

// Merkle DAG: Node type -> validation schema mapping
export const nodeSchemas = {
  SourceDoc: object({
    episodeId: string(),
    sourcePath: string(),
  }),
  Protagonist: object({
    name: string(),
    role: string(),
    traits: string(),
  }),
  Backstory: object({
    origin: string(),
    motivation: string(),
    conflict: string(),
  }),
  World: object({
    setting: string(),
    era: string(),
    rules: string(),
  }),
  Prompt: object({
    promptType: string(),
    style: string(),
    genre: string(),
  }),
  Writer: object({
    model: string(),
    maxTokens: number(),
    temperature: number(),
  }),
  ImageGen: object({
    model: string(),
    style: string(),
    count: number(),
  }),
  WebtoonPanelGen: object({
    panelCount: number(),
    style: string(),
    aspectRatio: string(),
  }),
  WebtoonLayout: object({
    layoutStyle: string(),
    textPosition: string(),
    readingDirection: string(),
  }),
  WebtoonExport: object({
    format: string(),
    platform: string(),
    quality: string(),
  }),
  TTS: object({
    voice: string(),
    speed: number(),
    format: string(),
  }),
  VideoGen: object({
    preferredRenderer: string(),
    resolution: string(),
    duration: number(),
  }),
  Render: object({
    renderer: string(),
    format: string(),
    quality: string(),
  }),
  ExportWattpad: object({
    format: string(),
    includeImages: boolean(),
    includeMetadata: boolean(),
  }),
  PublishYouTube: object({
    privacy: string(),
    title: string(),
    description: string(),
    tags: array(string()),
  }),
} as const;

export type NodeTypeKey = keyof typeof nodeSchemas;


