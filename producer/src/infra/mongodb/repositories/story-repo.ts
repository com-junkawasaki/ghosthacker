import { getMongoDb } from '../client';
import {
  ProjectSchema,
  NarrativeSchema,
  StylesSchema,
  EpisodeSchema,
  CharacterSchema,
  BackstorySchema,
  PlatformSchema,
  CanvasConfigSchema,
  type ProjectDocument,
  type NarrativeDocument,
  type StylesDocument,
  type EpisodeDocument,
  type CharacterDocument,
  type BackstoryDocument,
  type PlatformDocument,
  type CanvasConfigDocument,
} from '../schemas/story';

// Type definitions (exported for use in other modules)
export interface ProjectNode {
  id: string;
  title: string;
  logline: string;
  genres: string[];
  tone: string;
  audienceRating: string;
  language: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NarrativeNode {
  id: string;
  synopsis: string;
  structure: string;
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
  id: string;
  episodeId: string;
  name: string;
  episodeNumber: string;
  sourcePath: string;
  hasPart?: MediaObject[];
  createdAt: Date;
  updatedAt: Date;
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

const COLLECTIONS = {
  projects: 'story_projects',
  narratives: 'story_narratives',
  styles: 'story_styles',
  episodes: 'story_episodes',
  characters: 'story_characters',
  backstories: 'story_backstories',
  platforms: 'story_platforms',
  canvas: 'story_canvas',
} as const;

/**
 * Story repository for MongoDB operations
 * Migrated from Neo4j to MongoDB
 */
export class StoryMongoRepository {
  // Project operations
  async saveProject(project: Omit<ProjectNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ProjectNode> {
    const db = await getMongoDb();
    const collection = db.collection<ProjectDocument>(COLLECTIONS.projects);
    const now = new Date();
    const projectId = project.id || crypto.randomUUID();

    const doc: ProjectDocument = {
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
    };

    await collection.updateOne(
      { id: projectId },
      { $set: doc },
      { upsert: true }
    );

    return {
      id: projectId,
      title: doc.title,
      logline: doc.logline,
      genres: doc.genres,
      tone: doc.tone as typeof project.tone,
      audienceRating: doc.audienceRating,
      language: doc.language,
      keywords: doc.keywords,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async getProject(id: string): Promise<ProjectNode | null> {
    const db = await getMongoDb();
    const collection = db.collection<ProjectDocument>(COLLECTIONS.projects);
    const doc = await collection.findOne({ id });
    if (!doc) return null;

    return {
      id: doc.id,
      title: doc.title,
      logline: doc.logline,
      genres: doc.genres,
      tone: doc.tone as ProjectNode['tone'],
      audienceRating: doc.audienceRating,
      language: doc.language,
      keywords: doc.keywords,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // Narrative operations
  async saveNarrative(projectId: string, narrative: Omit<NarrativeNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<NarrativeNode> {
    const db = await getMongoDb();
    const collection = db.collection<NarrativeDocument>(COLLECTIONS.narratives);
    const now = new Date();
    const narrativeId = narrative.id || crypto.randomUUID();

    const doc: NarrativeDocument = {
      id: narrativeId,
      projectId,
      synopsis: narrative.synopsis,
      structure: narrative.structure,
      beats: narrative.beats,
      createdAt: now,
      updatedAt: now,
    };

    await collection.updateOne(
      { id: narrativeId },
      { $set: doc },
      { upsert: true }
    );

    return {
      id: narrativeId,
      synopsis: doc.synopsis,
      structure: doc.structure as NarrativeNode['structure'],
      beats: doc.beats,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async getNarrative(projectId: string): Promise<NarrativeNode | null> {
    const db = await getMongoDb();
    const collection = db.collection<NarrativeDocument>(COLLECTIONS.narratives);
    const doc = await collection.findOne({ projectId });
    if (!doc) return null;

    return {
      id: doc.id,
      synopsis: doc.synopsis,
      structure: doc.structure as NarrativeNode['structure'],
      beats: doc.beats,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // Styles operations
  async saveStyles(
    projectId: string,
    styles: {
      visual: { artStyle: string; palette: string; nsfwAllowed: boolean };
      audio: { voice: string; tempo: string; musicMood: string };
    }
  ) {
    const db = await getMongoDb();
    const collection = db.collection<StylesDocument>(COLLECTIONS.styles);
    const now = new Date();
    const stylesId = `${projectId}-styles`;

    const doc: StylesDocument = {
      id: stylesId,
      projectId,
      visual: styles.visual,
      audio: styles.audio,
      createdAt: now,
      updatedAt: now,
    };

    await collection.updateOne(
      { id: stylesId },
      { $set: doc },
      { upsert: true }
    );
  }

  async getStyles(projectId: string): Promise<StylesDocument | null> {
    const db = await getMongoDb();
    const collection = db.collection<StylesDocument>(COLLECTIONS.styles);
    return await collection.findOne({ projectId });
  }

  // Episode operations
  async saveEpisodes(projectId: string, episodes: Array<Omit<EpisodeNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>): Promise<EpisodeNode[]> {
    const db = await getMongoDb();
    const collection = db.collection<EpisodeDocument>(COLLECTIONS.episodes);
    const now = new Date();

    const docs = episodes.map(episode => ({
      id: episode.id || crypto.randomUUID(),
      projectId,
      episodeId: episode.episodeId,
      name: episode.name,
      episodeNumber: episode.episodeNumber,
      sourcePath: episode.sourcePath,
      hasPart: episode.hasPart,
      createdAt: now,
      updatedAt: now,
    }));

    const results: EpisodeNode[] = [];
    for (const doc of docs) {
      await collection.updateOne(
        { id: doc.id },
        { $set: doc },
        { upsert: true }
      );
      results.push({
        id: doc.id,
        episodeId: doc.episodeId,
        name: doc.name,
        episodeNumber: doc.episodeNumber,
        sourcePath: doc.sourcePath,
        hasPart: doc.hasPart,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    }

    return results;
  }

  async getEpisodes(projectId: string): Promise<EpisodeNode[]> {
    const db = await getMongoDb();
    const collection = db.collection<EpisodeDocument>(COLLECTIONS.episodes);
    const docs = await collection.find({ projectId }).toArray();
    return docs.map(doc => ({
      id: doc.id,
      episodeId: doc.episodeId,
      name: doc.name,
      episodeNumber: doc.episodeNumber,
      sourcePath: doc.sourcePath,
      hasPart: doc.hasPart,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  // Character operations
  async saveCharacters(projectId: string, characters: CharacterItem[]): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<CharacterDocument>(COLLECTIONS.characters);
    const now = new Date();

    // Delete existing characters for this project
    await collection.deleteMany({ projectId });

    // Insert new characters
    const docs = characters.map((char, index) => ({
      id: `${projectId}-character-${index}`,
      projectId,
      name: char.name,
      role: char.role,
      motivation: char.motivation,
      conflict: char.conflict,
      voice: char.voice,
      createdAt: now,
      updatedAt: now,
    }));

    if (docs.length > 0) {
      await collection.insertMany(docs);
    }
  }

  async getCharacters(projectId: string): Promise<CharacterItem[]> {
    const db = await getMongoDb();
    const collection = db.collection<CharacterDocument>(COLLECTIONS.characters);
    const docs = await collection.find({ projectId }).toArray();
    return docs.map(doc => ({
      name: doc.name,
      role: doc.role,
      motivation: doc.motivation,
      conflict: doc.conflict,
      voice: doc.voice,
    }));
  }

  // Backstory operations
  async saveBackstories(projectId: string, backstories: BackstoryItem[]): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<BackstoryDocument>(COLLECTIONS.backstories);
    const now = new Date();

    // Delete existing backstories for this project
    await collection.deleteMany({ projectId });

    // Insert new backstories
    const docs = backstories.map((backstory, index) => ({
      id: `${projectId}-backstory-${index}`,
      projectId,
      origin: backstory.origin,
      motivation: backstory.motivation,
      conflict: backstory.conflict,
      characterName: backstory.characterName,
      createdAt: now,
      updatedAt: now,
    }));

    if (docs.length > 0) {
      await collection.insertMany(docs);
    }
  }

  async getBackstories(projectId: string): Promise<BackstoryItem[]> {
    const db = await getMongoDb();
    const collection = db.collection<BackstoryDocument>(COLLECTIONS.backstories);
    const docs = await collection.find({ projectId }).toArray();
    return docs.map(doc => ({
      origin: doc.origin,
      motivation: doc.motivation,
      conflict: doc.conflict,
      characterName: doc.characterName,
    }));
  }

  // Platform operations
  async savePlatforms(
    projectId: string,
    platforms: {
      wattpad?: {
        chapterCount: number;
        includeImages: boolean;
        chapterLengthWords?: [number, number];
        imageFrequency?: 'none' | 'cover' | 'inline-1' | 'inline-3';
      };
      webtoon?: {
        episodePanels: number;
        bubbleDensity: 'low' | 'medium' | 'high';
        readingPace: 'slow' | 'standard' | 'fast';
        soundEffects: boolean;
      };
      youtube?: {
        targetDurationSec: number;
        aspectRatio: '9:16' | '16:9';
        captions: boolean;
        brollRatio: number;
      };
    }
  ): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<PlatformDocument>(COLLECTIONS.platforms);
    const now = new Date();
    const platformsId = `${projectId}-platforms`;

    const doc: PlatformDocument = {
      id: platformsId,
      projectId,
      wattpad: platforms.wattpad,
      webtoon: platforms.webtoon,
      youtube: platforms.youtube,
      createdAt: now,
      updatedAt: now,
    };

    await collection.updateOne(
      { id: platformsId },
      { $set: doc },
      { upsert: true }
    );
  }

  async getPlatforms(projectId: string): Promise<PlatformDocument | null> {
    const db = await getMongoDb();
    const collection = db.collection<PlatformDocument>(COLLECTIONS.platforms);
    const platformsId = `${projectId}-platforms`;
    return await collection.findOne({ id: platformsId });
  }

  // Canvas operations
  async saveCanvas(projectId: string, config: { nodes: unknown[]; edges: unknown[] }): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<CanvasConfigDocument>(COLLECTIONS.canvas);
    const now = new Date();

    const doc: CanvasConfigDocument = {
      projectId,
      nodes: config.nodes as Record<string, unknown>[],
      edges: config.edges as Record<string, unknown>[],
      createdAt: now,
      updatedAt: now,
    };

    await collection.updateOne(
      { projectId },
      { $set: doc },
      { upsert: true }
    );
  }

  async getCanvas(projectId: string): Promise<{ nodes: unknown[]; edges: unknown[] } | null> {
    const db = await getMongoDb();
    const collection = db.collection<CanvasConfigDocument>(COLLECTIONS.canvas);
    const doc = await collection.findOne({ projectId });
    if (!doc) return null;

    return {
      nodes: doc.nodes,
      edges: doc.edges,
    };
  }

  // Story graph operations (simplified - returns empty for now)
  async getStoryGraph(): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    // This was Neo4j-specific graph query, simplified for MongoDB
    // If needed, implement a graph-like structure using MongoDB documents
    return { nodes: [], edges: [] };
  }
}

// Singleton instance
export const storyRepository = new StoryMongoRepository();

