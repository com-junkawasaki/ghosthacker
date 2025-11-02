import { z } from 'zod';
import type { STRUCTURES, TONES, ART_STYLES, PALETTES, VOICES, TEMPOS, MUSIC } from '@/app/(producer)/canvas/story/types';

/**
 * Story-related MongoDB schemas
 */

export const ProjectSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  title: z.string(),
  logline: z.string(),
  genres: z.array(z.string()),
  tone: z.string(), // TONES type
  audienceRating: z.string(),
  language: z.string(),
  keywords: z.array(z.string()),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type ProjectDocument = z.infer<typeof ProjectSchema>;

export const NarrativeSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  projectId: z.string(),
  synopsis: z.string(),
  structure: z.string(), // STRUCTURES type
  beats: z.array(z.object({
    id: z.string(),
    label: z.string(),
    purpose: z.enum(['setup', 'conflict', 'climax']),
    targetLength: z.number(),
  })),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type NarrativeDocument = z.infer<typeof NarrativeSchema>;

export const StylesSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  projectId: z.string(),
  visual: z.object({
    artStyle: z.string(), // ART_STYLES type
    palette: z.string(), // PALETTES type
    nsfwAllowed: z.boolean(),
  }),
  audio: z.object({
    voice: z.string(), // VOICES type
    tempo: z.string(), // TEMPOS type
    musicMood: z.string(), // MUSIC type
  }),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type StylesDocument = z.infer<typeof StylesSchema>;

export const MediaObjectSchema = z.object({
  '@type': z.enum(['schema:TextDigitalDocument', 'schema:ImageObject', 'schema:VideoObject', 'schema:AudioObject']),
  'schema:contentUrl': z.string(),
  'schema:name': z.string().optional(),
  'schema:description': z.string().optional(),
});

export type MediaObject = z.infer<typeof MediaObjectSchema>;

export const EpisodeSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  projectId: z.string(),
  episodeId: z.string(),
  name: z.string(),
  episodeNumber: z.string(),
  sourcePath: z.string(),
  hasPart: z.array(MediaObjectSchema).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type EpisodeDocument = z.infer<typeof EpisodeSchema>;

export const CharacterSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  role: z.enum(['protagonist', 'antagonist', 'support']),
  motivation: z.string().optional(),
  conflict: z.string().optional(),
  voice: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CharacterDocument = z.infer<typeof CharacterSchema>;

export const BackstorySchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  projectId: z.string(),
  origin: z.string(),
  motivation: z.string().optional(),
  conflict: z.string().optional(),
  characterName: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type BackstoryDocument = z.infer<typeof BackstorySchema>;

export const PlatformSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  projectId: z.string(),
  wattpad: z.object({
    chapterCount: z.number(),
    includeImages: z.boolean(),
    chapterLengthWords: z.tuple([z.number(), z.number()]).optional(),
    imageFrequency: z.enum(['none', 'cover', 'inline-1', 'inline-3']).optional(),
  }).optional(),
  webtoon: z.object({
    episodePanels: z.number(),
    bubbleDensity: z.enum(['low', 'medium', 'high']),
    readingPace: z.enum(['slow', 'standard', 'fast']),
    soundEffects: z.boolean(),
  }).optional(),
  youtube: z.object({
    targetDurationSec: z.number(),
    aspectRatio: z.enum(['9:16', '16:9']),
    captions: z.boolean(),
    brollRatio: z.number(),
  }).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type PlatformDocument = z.infer<typeof PlatformSchema>;

export const CanvasConfigSchema = z.object({
  _id: z.string().optional(),
  projectId: z.string(),
  nodes: z.array(z.record(z.unknown())),
  edges: z.array(z.record(z.unknown())),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type CanvasConfigDocument = z.infer<typeof CanvasConfigSchema>;

