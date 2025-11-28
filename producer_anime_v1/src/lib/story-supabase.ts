/**
 * @context https://schema.org/SoftwareApplication
 * @type {gh:StoryRepository}
 * Merkle DAG: story-supabase -> drizzle-orm -> postgres -> supabase
 * Story data persistence layer using Supabase PostgreSQL via Drizzle ORM
 */
import { db } from '@/infra/supabase/db';
import { projects, narratives, characters, backstories, episodes, styles, platforms, canvas } from '@/infra/supabase/schema';
import { eq, desc } from 'drizzle-orm';
import type { STRUCTURES, TONES, ART_STYLES, PALETTES, VOICES, TEMPOS, MUSIC } from '@/app/(producer)/canvas/story/types';

// Re-export interfaces for compatibility
export interface ProjectNode {
  id: string;
  title: string;
  logline: string;
  genres: string[];
  tone: (typeof TONES)[number];
  audienceRating: string;
  language: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NarrativeNode {
  id: string;
  synopsis: string;
  structure: (typeof STRUCTURES)[number];
  beats: Array<{
    id: string;
    label: string;
    purpose: 'setup' | 'conflict' | 'climax';
    targetLength: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export type MediaObject = {
  "@type": "schema:TextDigitalDocument" | "schema:ImageObject" | "schema:VideoObject" | "schema:AudioObject";
  "schema:contentUrl": string;
  "schema:name"?: string;
  "schema:description"?: string;
};

export interface EpisodeNode {
  id: string; // maps to @id
  episodeId: string; // for compatibility with SourceDoc schema
  name: string;
  episodeNumber: string;
  sourcePath: string; // path to source file
  hasPart?: MediaObject[];
  createdAt: Date;
  updatedAt: Date;
}

export type EpisodeInput = {
  "@id": string;
  "schema:name": string;
  "schema:episodeNumber": string;
  "gh:hasPart"?: MediaObject[];
}

export interface CharacterItem {
  name: string;
  role: 'protagonist' | 'antagonist' | 'support';
  motivation?: string;
  conflict?: string;
  voice?: string;
}

export interface BackstoryItem {
  origin: string;
  motivation?: string;
  conflict?: string;
  characterName?: string;
}

export class StorySupabaseRepository {
  // Create or update project
  async saveProject(project: Omit<ProjectNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ProjectNode> {
    const now = new Date();
    const projectId = project.id || crypto.randomUUID();

    const [saved] = await db
      .insert(projects)
      .values({
        id: projectId,
        title: project.title,
        logline: project.logline,
        genres: project.genres,
        tone: project.tone,
        audienceRating: project.audienceRating,
        language: project.language,
        keywords: project.keywords,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          title: project.title,
          logline: project.logline,
          genres: project.genres,
          tone: project.tone,
          audienceRating: project.audienceRating,
          language: project.language,
          keywords: project.keywords,
          updatedAt: now,
        },
      })
      .returning();

    return {
      id: saved.id,
      title: saved.title,
      logline: saved.logline,
      genres: saved.genres,
      tone: saved.tone as (typeof TONES)[number],
      audienceRating: saved.audienceRating,
      language: saved.language,
      keywords: saved.keywords,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  // Get project by ID
  async getProject(id: string): Promise<ProjectNode | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) return null;

    return {
      id: project.id,
      title: project.title,
      logline: project.logline,
      genres: project.genres,
      tone: project.tone as (typeof TONES)[number],
      audienceRating: project.audienceRating,
      language: project.language,
      keywords: project.keywords,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  // Get all projects
  async getAllProjects(): Promise<ProjectNode[]> {
    const results = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));

    return results.map(project => ({
      id: project.id,
      title: project.title,
      logline: project.logline,
      genres: project.genres,
      tone: project.tone as (typeof TONES)[number],
      audienceRating: project.audienceRating,
      language: project.language,
      keywords: project.keywords,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  }

  // Save narrative and link to project
  async saveNarrative(projectId: string, narrative: Omit<NarrativeNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<NarrativeNode> {
    const now = new Date();
    const narrativeId = narrative.id || crypto.randomUUID();

    // Delete existing narrative for this project first
    await db.delete(narratives).where(eq(narratives.projectId, projectId));

    const [saved] = await db
      .insert(narratives)
      .values({
        id: narrativeId,
        projectId,
        synopsis: narrative.synopsis,
        structure: narrative.structure,
        beats: narrative.beats,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      id: saved.id,
      synopsis: saved.synopsis,
      structure: saved.structure as (typeof STRUCTURES)[number],
      beats: saved.beats,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  // Get narrative for project
  async getNarrative(projectId: string): Promise<NarrativeNode | null> {
    const [narrative] = await db
      .select()
      .from(narratives)
      .where(eq(narratives.projectId, projectId))
      .limit(1);

    if (!narrative) return null;

    return {
      id: narrative.id,
      synopsis: narrative.synopsis,
      structure: narrative.structure as (typeof STRUCTURES)[number],
      beats: narrative.beats,
      createdAt: narrative.createdAt,
      updatedAt: narrative.updatedAt,
    };
  }

  // Save characters and link to project
  async saveCharacters(projectId: string, charactersList: CharacterItem[]) {
    // Delete existing characters for this project
    await db.delete(characters).where(eq(characters.projectId, projectId));

    // Insert new characters
    if (charactersList.length > 0) {
      await db.insert(characters).values(
        charactersList.map(ch => ({
          projectId,
          name: ch.name,
          role: ch.role,
          motivation: ch.motivation ?? null,
          conflict: ch.conflict ?? null,
          voice: ch.voice ?? null,
        }))
      );
    }

    return { ok: true as const };
  }

  async getCharacters(projectId: string): Promise<CharacterItem[]> {
    const results = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId))
      .orderBy(characters.name);

    return results.map(c => ({
      name: c.name,
      role: c.role as CharacterItem['role'],
      motivation: c.motivation ?? undefined,
      conflict: c.conflict ?? undefined,
      voice: c.voice ?? undefined,
    }));
  }

  // Save backstories and link to project
  async saveBackstories(projectId: string, backstoriesList: BackstoryItem[]) {
    // Delete existing backstories for this project
    await db.delete(backstories).where(eq(backstories.projectId, projectId));

    // Get character IDs for linking
    const projectCharacters = await db
      .select()
      .from(characters)
      .where(eq(characters.projectId, projectId));

    const characterMap = new Map(projectCharacters.map(c => [c.name, c.id]));

    // Insert new backstories
    if (backstoriesList.length > 0) {
      await db.insert(backstories).values(
        backstoriesList.map(b => ({
          projectId,
          characterId: b.characterName ? characterMap.get(b.characterName) ?? null : null,
          origin: b.origin,
          motivation: b.motivation ?? null,
          conflict: b.conflict ?? null,
        }))
      );
    }

    return { ok: true as const };
  }

  async getBackstories(projectId: string): Promise<BackstoryItem[]> {
    const results = await db
      .select({
        origin: backstories.origin,
        motivation: backstories.motivation,
        conflict: backstories.conflict,
        characterName: characters.name,
      })
      .from(backstories)
      .leftJoin(characters, eq(backstories.characterId, characters.id))
      .where(eq(backstories.projectId, projectId))
      .orderBy(desc(backstories.updatedAt));

    return results.map(b => ({
      origin: b.origin,
      motivation: b.motivation ?? undefined,
      conflict: b.conflict ?? undefined,
      characterName: b.characterName ?? undefined,
    }));
  }

  // Save episodes and link to project
  async saveEpisodes(projectId: string, episodesList: EpisodeInput[]) {
    // Delete existing episodes for this project
    await db.delete(episodes).where(eq(episodes.projectId, projectId));

    // Insert new episodes
    if (episodesList.length > 0) {
      await db.insert(episodes).values(
        episodesList.map(ep => ({
          id: ep['@id'],
          projectId,
          episodeId: ep['@id'],
          name: ep['schema:name'],
          episodeNumber: ep['schema:episodeNumber'],
          hasPart: ep['gh:hasPart'] ?? null,
        }))
      );
    }

    return { ok: true as const };
  }

  async getEpisodes(projectId: string): Promise<EpisodeNode[]> {
    const results = await db
      .select()
      .from(episodes)
      .where(eq(episodes.projectId, projectId))
      .orderBy(episodes.episodeNumber);

    return results.map(e => ({
      id: e.id,
      episodeId: e.episodeId,
      name: e.name,
      episodeNumber: e.episodeNumber,
      sourcePath: e.sourcePath ?? '',
      hasPart: e.hasPart ?? undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }

  // Save styles and link to project
  async saveStyles(
    projectId: string,
    stylesData: {
      visual: { artStyle: string; palette: string; nsfwAllowed: boolean };
      audio: { voice: string; tempo: string; musicMood: string };
    }
  ) {
    const now = new Date();

    const [saved] = await db
      .insert(styles)
      .values({
        projectId,
        visual: stylesData.visual,
        audio: stylesData.audio,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: styles.projectId,
        set: {
          visual: stylesData.visual,
          audio: stylesData.audio,
          updatedAt: now,
        },
      })
      .returning();

    return saved;
  }

  async getStyles(projectId: string): Promise<{
    visual: { artStyle: (typeof ART_STYLES)[number]; palette: (typeof PALETTES)[number]; nsfwAllowed: boolean };
    audio: { voice: (typeof VOICES)[number]; tempo: (typeof TEMPOS)[number]; musicMood: (typeof MUSIC)[number] };
  } | null> {
    const [style] = await db
      .select()
      .from(styles)
      .where(eq(styles.projectId, projectId))
      .limit(1);

    if (!style) return null;

    return {
      visual: style.visual as {
        artStyle: (typeof ART_STYLES)[number];
        palette: (typeof PALETTES)[number];
        nsfwAllowed: boolean;
      },
      audio: style.audio as {
        voice: (typeof VOICES)[number];
        tempo: (typeof TEMPOS)[number];
        musicMood: (typeof MUSIC)[number];
      },
    };
  }

  // Save platforms and link to project
  async savePlatforms(projectId: string, data: {
    wattpad: { chapterCount: number; includeImages: boolean; chapterLengthWords?: [number, number]; imageFrequency: string };
    webtoon: { episodePanels: number; bubbleDensity: string; readingPace: string; soundEffects: boolean };
    youtube: { targetDurationSec: number; aspectRatio: string; captions: boolean; brollRatio: number };
  }) {
    const now = new Date();

    const [saved] = await db
      .insert(platforms)
      .values({
        projectId,
        wattpad: data.wattpad,
        webtoon: data.webtoon,
        youtube: data.youtube,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: platforms.projectId,
        set: {
          wattpad: data.wattpad,
          webtoon: data.webtoon,
          youtube: data.youtube,
          updatedAt: now,
        },
      })
      .returning();

    return saved;
  }

  async getPlatforms(projectId: string) {
    const [platform] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.projectId, projectId))
      .limit(1);

    if (!platform) return null;

    return {
      wattpad: platform.wattpad,
      webtoon: platform.webtoon,
      youtube: platform.youtube,
    };
  }

  // Save canvas config JSON and link to project
  async saveCanvas(projectId: string, config: { nodes: unknown[]; edges: unknown[] }) {
    const now = new Date();

    const [saved] = await db
      .insert(canvas)
      .values({
        projectId,
        config,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: canvas.projectId,
        set: {
          config,
          updatedAt: now,
        },
      })
      .returning();

    return saved;
  }

  async getCanvas(projectId: string): Promise<{ nodes: unknown[]; edges: unknown[] } | null> {
    const [canvasData] = await db
      .select()
      .from(canvas)
      .where(eq(canvas.projectId, projectId))
      .limit(1);

    if (!canvasData) return null;

    const config = canvasData.config as { nodes?: unknown[]; edges?: unknown[] };
    return {
      nodes: config.nodes ?? [],
      edges: config.edges ?? [],
    };
  }

  // Get story graph (simplified - returns empty for now, can be enhanced with graph queries)
  async getStoryGraph(): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    // For now, return empty graph. This can be enhanced to query relationships across tables
    return { nodes: [], edges: [] };
  }
}

// Singleton instance
export const storyRepository = new StorySupabaseRepository();

