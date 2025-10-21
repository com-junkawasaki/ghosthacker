// Merkle DAG: story-types -> used by (producer)/story UI and pipeline mapping
import { array, boolean, literal, maxLength, minLength, minValue, maxValue, number, object, optional, picklist, string, tuple, pipe, nonEmpty } from 'valibot';

// Result type for server actions
export type Fault = { code: string; message: string; path?: string[] };
export type Result<T> = { ok: true; value: T } | { ok: false; faults: Fault[] };

export type Genre = 'horror' | 'mystery' | 'thriller' | 'romance' | 'sci-fi' | 'fantasy';
export type Tone = 'atmospheric' | 'comedic' | 'dark' | 'hopeful';
export type Structure =
  | '3-act'
  | '4-act'
  | '8-sequence'
  | 'webtoon-episodic'
  | 'Episodic Arc Structure'
  | 'Linear Static Episodic'
  | 'Complete Episodic Independence'
  | 'Hybrid Gag/Serious'
  | 'Growth Arc Chain'
  | 'Archipelago Arc Chain + Meta-Mystery'
  | 'Hybrid: Linear Episodic + Archipelago Arc';
export type Role = 'protagonist' | 'antagonist' | 'support';

export const ProjectSchema = object({
  title: pipe(string(), minLength(1), maxLength(60)),
  logline: pipe(string(), minLength(1), maxLength(160)),
  genres: pipe(array(picklist(['horror', 'mystery', 'thriller', 'romance', 'sci-fi', 'fantasy'] as const)), nonEmpty()),
  tone: picklist(['atmospheric', 'comedic', 'dark', 'hopeful'] as const),
  audienceRating: literal('PG-13'),
  language: literal('en'),
  keywords: optional(array(pipe(string(), minLength(1), maxLength(32))), []),
});

export const BeatSchema = object({
  id: string(),
  label: pipe(string(), minLength(1), maxLength(64)),
  purpose: picklist(['setup', 'conflict', 'climax'] as const),
  targetLength: pipe(number(), minValue(20), maxValue(1500)),
});

export const NarrativeSchema = object({
  synopsis: pipe(string(), minLength(1), maxLength(1200 * 6)), // rough char cap
  structure: picklist([
    '3-act',
    '4-act',
    '8-sequence',
    'webtoon-episodic',
    'Episodic Arc Structure',
    'Linear Static Episodic',
    'Complete Episodic Independence',
    'Hybrid Gag/Serious',
    'Growth Arc Chain',
    'Archipelago Arc Chain + Meta-Mystery',
    'Hybrid: Linear Episodic + Archipelago Arc',
  ] as const),
  beats: optional(array(BeatSchema), []),
});

export const CharacterSchema = object({
  name: pipe(string(), minLength(1), maxLength(40)),
  role: picklist(['protagonist', 'antagonist', 'support'] as const),
  motivation: optional(pipe(string(), maxLength(180))),
  conflict: optional(pipe(string(), maxLength(180))),
  voice: optional(pipe(string(), maxLength(120))),
});

export const VisualStyleSchema = object({
  artStyle: picklist(['anime', 'semi-realistic', 'painterly', 'minimal'] as const),
  palette: picklist(['cool', 'warm', 'monochrome', 'high-contrast'] as const),
  nsfwAllowed: literal(false),
});

export const AudioStyleSchema = object({
  voice: picklist(['alloy', 'verse', 'aria'] as const),
  tempo: picklist(['calm', 'neutral', 'fast'] as const),
  musicMood: picklist(['eerie', 'tense', 'melancholic', 'uplifting'] as const),
});

export const WattpadExtSchema = object({
  chapterCount: pipe(number(), minValue(1), maxValue(30)),
  includeImages: boolean(),
  chapterLengthWords: optional(tuple([number(), number()])),
  imageFrequency: picklist(['none', 'cover', 'inline-1', 'inline-3'] as const),
});

export const WebtoonExtSchema = object({
  episodePanels: pipe(number(), minValue(8), maxValue(80)),
  bubbleDensity: picklist(['low', 'medium', 'high'] as const),
  readingPace: picklist(['slow', 'standard', 'fast'] as const),
  soundEffects: boolean(),
});

export const YouTubeExtSchema = object({
  targetDurationSec: pipe(number(), minValue(60), maxValue(900)),
  aspectRatio: picklist(['9:16', '16:9'] as const),
  captions: boolean(),
  brollRatio: pipe(number(), minValue(0), maxValue(1)),
});

export const StoryBriefSchema = object({
  project: ProjectSchema,
  narrative: NarrativeSchema,
  characters: optional(array(CharacterSchema), []),
  visual: VisualStyleSchema,
  audio: AudioStyleSchema,
  wattpad: WattpadExtSchema,
  webtoon: WebtoonExtSchema,
  youtube: YouTubeExtSchema,
});

export type StoryBriefInput = {
  project: {
    title: string;
    logline: string;
    genres: Genre[];
    tone: Tone;
    audienceRating: 'PG-13';
    language: 'en';
    keywords?: string[];
  };
  narrative: {
    synopsis: string;
    structure: Structure;
    beats?: { id: string; label: string; purpose: 'setup' | 'conflict' | 'climax'; targetLength: number }[];
  };
  characters?: {
    name: string; role: Role; motivation?: string; conflict?: string; voice?: string;
  }[];
  visual: { artStyle: 'anime' | 'semi-realistic' | 'painterly' | 'minimal'; palette: 'cool' | 'warm' | 'monochrome' | 'high-contrast'; nsfwAllowed: false };
  audio: { voice: 'alloy' | 'verse' | 'aria'; tempo: 'calm' | 'neutral' | 'fast'; musicMood: 'eerie' | 'tense' | 'melancholic' | 'uplifting' };
  wattpad: { chapterCount: number; includeImages: boolean; chapterLengthWords?: [number, number]; imageFrequency: 'none' | 'cover' | 'inline-1' | 'inline-3' };
  webtoon: { episodePanels: number; bubbleDensity: 'low' | 'medium' | 'high'; readingPace: 'slow' | 'standard' | 'fast'; soundEffects: boolean };
  youtube: { targetDurationSec: number; aspectRatio: '9:16' | '16:9'; captions: boolean; brollRatio: number };
};


