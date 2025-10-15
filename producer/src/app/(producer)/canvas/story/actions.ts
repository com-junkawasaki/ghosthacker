"use server";
// Merkle DAG: story.actions -> validates inputs -> persists to neo4j -> seeds pipeline later
import { safeParse } from 'valibot';
import { ProjectSchema, NarrativeSchema, CharacterSchema, VisualStyleSchema, AudioStyleSchema, WattpadExtSchema, WebtoonExtSchema, YouTubeExtSchema } from '@/types/story';
import { deriveCanvasConfig } from '@/lib/mapping';
import { storyRepository } from '@/lib/story-neo4j';

// Default project ID for this session (in production, this would be user-specific)
const DEFAULT_PROJECT_ID = 'ghost-hacker-project';

export type ServerActionResult<T> = { ok: true; value: T } | { ok: false; faults: { code: string; message: string; path?: string[] }[] };

export type ProjectInput = {
  title: string;
  logline: string;
  genres: ('horror' | 'mystery' | 'thriller' | 'romance' | 'sci-fi' | 'fantasy')[];
  tone: 'atmospheric' | 'comedic' | 'dark' | 'hopeful';
  audienceRating: 'PG-13';
  language: 'en';
  keywords?: string[];
};

export async function submitOverview(input: ProjectInput): Promise<ServerActionResult<ProjectInput>> {
  // Validate with Valibot
  const result = safeParse(ProjectSchema, input);
  if (!result.success) {
    const faults = result.issues.map((i) => ({
      code: 'validation_error',
      message: i.message ?? 'Invalid value',
      path: i.path?.map((p) => String(p.key)),
    }));
    return { ok: false, faults };
  }

  try {
    // Persist to Neo4j
    await storyRepository.saveProject({
      id: DEFAULT_PROJECT_ID,
      title: input.title,
      logline: input.logline,
      genres: input.genres,
      tone: input.tone,
      audienceRating: input.audienceRating,
      language: input.language,
      keywords: input.keywords || [],
    });

    return { ok: true, value: input };
  } catch (error) {
    console.error('Failed to save project:', error);
    return {
      ok: false,
      faults: [{ code: 'database_error', message: 'Failed to save project to database' }]
    };
  }
}

export type NarrativeInput = {
  synopsis: string;
  structure: '3-act' | '4-act' | '8-sequence' | 'webtoon-episodic';
  beats?: { id: string; label: string; purpose: 'setup' | 'conflict' | 'climax'; targetLength: number }[];
};

export async function submitNarrative(input: NarrativeInput): Promise<ServerActionResult<NarrativeInput>> {
  const result = safeParse(NarrativeSchema, input);
  if (!result.success) {
    const faults = result.issues.map((i) => ({
      code: 'validation_error',
      message: i.message ?? 'Invalid value',
      path: i.path?.map((p) => String(p.key)),
    }));
    return { ok: false, faults };
  }

  try {
    // Persist to Neo4j, linked to the default project
    await storyRepository.saveNarrative(DEFAULT_PROJECT_ID, {
      synopsis: input.synopsis,
      structure: input.structure,
      beats: input.beats || [],
    });

    return { ok: true, value: input };
  } catch (error) {
    console.error('Failed to save narrative:', error);
    return {
      ok: false,
      faults: [{ code: 'database_error', message: 'Failed to save narrative to database' }]
    };
  }
}

export type CharacterInput = {
  name: string;
  role: 'protagonist' | 'antagonist' | 'support';
  motivation?: string;
  conflict?: string;
  voice?: string;
};

export async function submitCharacters(input: CharacterInput[]): Promise<ServerActionResult<CharacterInput[]>> {
  // Validate each character
  for (const ch of input) {
    const result = safeParse(CharacterSchema, ch);
    if (!result.success) {
      const faults = result.issues.map((i) => ({
        code: 'validation_error',
        message: i.message ?? 'Invalid value',
        path: i.path?.map((p) => String(p.key)),
      }));
      return { ok: false, faults };
    }
  }
  return { ok: true, value: input };
}

export type StylesInput = {
  visual: { artStyle: 'anime'|'semi-realistic'|'painterly'|'minimal'; palette: 'cool'|'warm'|'monochrome'|'high-contrast'; nsfwAllowed: false };
  audio: { voice: 'alloy'|'verse'|'aria'; tempo: 'calm'|'neutral'|'fast'; musicMood: 'eerie'|'tense'|'melancholic'|'uplifting' };
};

export async function submitStyles(input: StylesInput): Promise<ServerActionResult<StylesInput>> {
  const visual = safeParse(VisualStyleSchema, input.visual);
  const audio = safeParse(AudioStyleSchema, input.audio);
  if (!visual.success || !audio.success) {
    const faults = [...(visual.success?[]:visual.issues), ...(audio.success?[]:audio.issues)].map(i=>({
      code: 'validation_error',
      message: i.message ?? 'Invalid value',
      path: i.path?.map(p=>String(p.key)),
    }));
    return { ok: false, faults };
  }
  try {
    await storyRepository.saveStyles(DEFAULT_PROJECT_ID, { visual: input.visual, audio: input.audio });
    return { ok: true, value: input };
  } catch (error) {
    console.error('Failed to save styles:', error);
    return { ok: false, faults: [{ code: 'database_error', message: 'Failed to save styles to database' }] };
  }
}

export type PlatformsInput = {
  wattpad: { chapterCount: number; includeImages: boolean; chapterLengthWords?: [number, number]; imageFrequency: 'none'|'cover'|'inline-1'|'inline-3' };
  webtoon: { episodePanels: number; bubbleDensity: 'low'|'medium'|'high'; readingPace: 'slow'|'standard'|'fast'; soundEffects: boolean };
  youtube: { targetDurationSec: number; aspectRatio: '9:16'|'16:9'; captions: boolean; brollRatio: number };
};

export async function submitPlatforms(input: PlatformsInput): Promise<ServerActionResult<PlatformsInput>> {
  const w = safeParse(WattpadExtSchema, input.wattpad);
  const wb = safeParse(WebtoonExtSchema, input.webtoon);
  const yt = safeParse(YouTubeExtSchema, input.youtube);
  if (!w.success || !wb.success || !yt.success) {
    const faults = [
      ...(w.success?[]:w.issues),
      ...(wb.success?[]:wb.issues),
      ...(yt.success?[]:yt.issues),
    ].map(i=>({ code: 'validation_error', message: i.message ?? 'Invalid value', path: i.path?.map(p=>String(p.key)) }));
    return { ok: false, faults };
  }
  try {
    await storyRepository.savePlatforms(DEFAULT_PROJECT_ID, input);
    return { ok: true, value: input };
  } catch (error) {
    console.error('Failed to save platforms:', error);
    return { ok: false, faults: [{ code: 'database_error', message: 'Failed to save platforms to database' }] };
  }
}

// Data loading functions
export async function loadProject(): Promise<ProjectInput | null> {
  try {
    const project = await storyRepository.getProject(DEFAULT_PROJECT_ID);
    if (!project) return null;

    return {
      title: project.title,
      logline: project.logline,
      genres: project.genres as ProjectInput['genres'],
      tone: project.tone as ProjectInput['tone'],
      audienceRating: 'PG-13',
      language: 'en',
      keywords: project.keywords,
    };
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
}

export async function loadNarrative(): Promise<NarrativeInput | null> {
  try {
    const narrative = await storyRepository.getNarrative(DEFAULT_PROJECT_ID);
    if (!narrative) return null;

    return {
      synopsis: narrative.synopsis,
      structure: narrative.structure as NarrativeInput['structure'],
      beats: (narrative.beats ?? []).map(beat => ({
        id: beat.id,
        label: beat.label,
        purpose: beat.purpose as 'setup' | 'conflict' | 'climax',
        targetLength: beat.targetLength,
      })),
    };
  } catch (error) {
    console.error('Failed to load narrative:', error);
    return null;
  }
}

export async function loadStyles(): Promise<StylesInput | null> {
  try {
    const s = await storyRepository.getStyles(DEFAULT_PROJECT_ID);
    if (!s) return null;
    return {
      visual: {
        artStyle: s.visual.artStyle as StylesInput['visual']['artStyle'],
        palette: s.visual.palette as StylesInput['visual']['palette'],
        nsfwAllowed: false,
      },
      audio: {
        voice: s.audio.voice as StylesInput['audio']['voice'],
        tempo: s.audio.tempo as StylesInput['audio']['tempo'],
        musicMood: s.audio.musicMood as StylesInput['audio']['musicMood'],
      },
    };
  } catch (error) {
    console.error('Failed to load styles:', error);
    return null;
  }
}

export async function loadPlatforms(): Promise<PlatformsInput | null> {
  try {
    const pl = await storyRepository.getPlatforms(DEFAULT_PROJECT_ID);
    if (!pl) return null;
    return {
      wattpad: {
        chapterCount: pl.wattpad.chapterCount,
        includeImages: pl.wattpad.includeImages,
        chapterLengthWords: pl.wattpad.chapterLengthWords as [number, number] | undefined,
        imageFrequency: pl.wattpad.imageFrequency as PlatformsInput['wattpad']['imageFrequency'],
      },
      webtoon: {
        episodePanels: pl.webtoon.episodePanels,
        bubbleDensity: pl.webtoon.bubbleDensity as PlatformsInput['webtoon']['bubbleDensity'],
        readingPace: pl.webtoon.readingPace as PlatformsInput['webtoon']['readingPace'],
        soundEffects: pl.webtoon.soundEffects,
      },
      youtube: {
        targetDurationSec: pl.youtube.targetDurationSec,
        aspectRatio: pl.youtube.aspectRatio as PlatformsInput['youtube']['aspectRatio'],
        captions: pl.youtube.captions,
        brollRatio: pl.youtube.brollRatio,
      },
    };
  } catch (error) {
    console.error('Failed to load platforms:', error);
    return null;
  }
}

// Seed canvas by deriving config from saved data and persisting to Neo4j
export async function seedCanvas(): Promise<ServerActionResult<{ nodes: unknown[]; edges: unknown[] }>> {
  try {
    const [project, narrative, styles, platforms] = await Promise.all([
      storyRepository.getProject(DEFAULT_PROJECT_ID),
      storyRepository.getNarrative(DEFAULT_PROJECT_ID),
      storyRepository.getStyles(DEFAULT_PROJECT_ID),
      storyRepository.getPlatforms(DEFAULT_PROJECT_ID),
    ]);
    const config = deriveCanvasConfig({
      project: project ? { title: project.title } : undefined,
      narrative: narrative ? { beats: narrative.beats } : undefined,
      styles: styles ? { visual: styles.visual, audio: styles.audio } : undefined,
      platforms: platforms ?? undefined,
    });
    await storyRepository.saveCanvas(DEFAULT_PROJECT_ID, config);
    return { ok: true, value: config };
  } catch (error) {
    console.error('Failed to seed canvas:', error);
    return { ok: false, faults: [{ code: 'database_error', message: 'Failed to seed canvas' }] };
  }
}


