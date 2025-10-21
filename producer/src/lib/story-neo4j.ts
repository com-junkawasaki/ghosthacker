import { getNeo4jDriver } from '../infra/neo4j/client';
import * as Cypher from '@neo4j/cypher-builder';
import type { STRUCTURES, TONES, ART_STYLES, PALETTES, VOICES, TEMPOS, MUSIC } from '@/app/(producer)/canvas/story/types';

// Merkle DAG: story-neo4j -> neo4j-driver -> cypher-builder
// Story data persistence layer using Neo4j graph database

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
  "@type": | "schema:TextDigitalDocument" | "schema:ImageObject" | "schema:VideoObject" | "schema:AudioObject";
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

export class StoryNeo4jRepository {
  private driver = getNeo4jDriver();

  // Create or update project
  async saveProject(project: Omit<ProjectNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ProjectNode> {
    const session = this.driver.session();

    try {
      const now = new Date();
      const projectId = project.id || crypto.randomUUID();

      const projectNode = new Cypher.Node();

      const query = new Cypher.Merge(
          new Cypher.Pattern(projectNode, {
              labels: ["Project"],
              properties: { id: new Cypher.Param(projectId) }
          })
      )
      .set([
          projectNode,
          new Cypher.Map({
              title: new Cypher.Param(project.title),
              logline: new Cypher.Param(project.logline),
              genres: new Cypher.Param(project.genres),
              tone: new Cypher.Param(project.tone),
              audienceRating: new Cypher.Param(project.audienceRating),
              language: new Cypher.Param(project.language),
              keywords: new Cypher.Param(project.keywords),
              createdAt: new Cypher.Param(now.toISOString()),
              updatedAt: new Cypher.Param(now.toISOString()),
          })
      ])
      .return([projectNode, 'projectNode']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);
      const record = result.records[0];

      return {
        id: record.get('projectNode').properties.id,
        title: record.get('projectNode').properties.title,
        logline: record.get('projectNode').properties.logline,
        genres: record.get('projectNode').properties.genres,
        tone: record.get('projectNode').properties.tone,
        audienceRating: record.get('projectNode').properties.audienceRating,
        language: record.get('projectNode').properties.language,
        keywords: record.get('projectNode').properties.keywords,
        createdAt: new Date(record.get('projectNode').properties.createdAt),
        updatedAt: new Date(record.get('projectNode').properties.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  // Save styles and link to project
  async saveStyles(
    projectId: string,
    styles: {
      visual: { artStyle: string; palette: string; nsfwAllowed: boolean };
      audio: { voice: string; tempo: string; musicMood: string };
    }
  ) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const projectIdParam = new Cypher.Param(projectId);
      const nowParam = new Cypher.Param(now);

      const project = new Cypher.Node();
      const stylesNode = new Cypher.Node();
      const stylesId = `${projectId}-styles`;

      const query = new Cypher.Match(
          new Cypher.Pattern(project, { properties: { id: projectIdParam } })
      )
          .merge(
              new Cypher.Pattern(stylesNode, {
                  properties: { id: new Cypher.Param(stylesId) }
              })
          )
          .onCreateSet([
              stylesNode,
              new Cypher.Map({
                  visual: new Cypher.Param(styles.visual),
                  audio: new Cypher.Param(styles.audio),
                  createdAt: nowParam,
                  updatedAt: nowParam
              })
          ])
          .onMatchSet([
              stylesNode,
              new Cypher.Map({
                  visual: new Cypher.Param(styles.visual),
                  audio: new Cypher.Param(styles.audio),
                  updatedAt: nowParam
              })
          ])
          .with(project, stylesNode)
          .merge(
              // @ts-expect-error - cypher-builder types are incorrect
              new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_STYLES" })).to(stylesNode)
          )
          .return([stylesNode, 'stylesNode']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);
      return result.records[0]?.get('stylesNode').properties ?? null;
    } finally {
      await session.close();
    }
  }

  // Episodes: save list and link to project
  async saveEpisodes(projectId: string, episodes: EpisodeInput[]) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const projectIdParam = new Cypher.Param(projectId);

      for (const ep of episodes) {
      const project = new Cypher.Node();
      const episode = new Cypher.Node();
        
        const hasPartValue = ep['gh:hasPart'] ? JSON.stringify(ep['gh:hasPart']) : null;
        const nowParam = new Cypher.Param(now);

        const query = new Cypher.Match(
                new Cypher.Pattern(project, { properties: { id: projectIdParam } })
            )
            .merge(
                new Cypher.Pattern(episode, {
                    properties: { id: new Cypher.Param(ep["@id"]) }
                })
            )
            .onCreateSet([
                episode,
                new Cypher.Map({
                    'schema:name': new Cypher.Param(ep["schema:name"]),
                    'schema:episodeNumber': new Cypher.Param(ep["schema:episodeNumber"]),
                    'gh:hasPart': new Cypher.Param(hasPartValue),
                    createdAt: nowParam,
                    updatedAt: nowParam
                })
            ])
            .onMatchSet([
                episode,
                new Cypher.Map({
                    'schema:name': new Cypher.Param(ep["schema:name"]),
                    'schema:episodeNumber': new Cypher.Param(ep["schema:episodeNumber"]),
                    'gh:hasPart': new Cypher.Param(hasPartValue),
                    updatedAt: nowParam
                })
            ])
            .with(project, episode)
            .merge(
                // @ts-expect-error - cypher-builder types are incorrect
                new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_EPISODE" })).to(episode)
            )
            .return(episode);
        
        const { cypher, params } = query.build();
        await session.run(cypher, params);
      }
      return { ok: true as const };
    } finally {
      await session.close();
    }
  }

  async getEpisodes(projectId: string): Promise<EpisodeNode[]> {
    const session = this.driver.session();
    try {
      const project = new Cypher.Node();
      const episode = new Cypher.Node();

      const matchQuery = new Cypher.Match(
        // @ts-expect-error - cypher-builder types are incorrect
        new Cypher.Pattern(project, { labels: ["Project"], properties: { id: new Cypher.Param(projectId) } }).related(new Cypher.Relationship({ type: "HAS_EPISODE" })).to(episode)
      )
      .return([episode, 'episode'])
      .orderBy([episode.property("schema:episodeNumber"), "ASC"]);

      const { cypher, params } = matchQuery.build();
      const res = await session.run(cypher, params);

      return res.records.map(r => {
        const e = r.get("episode").properties;
        return { 
          id: e.id, 
          name: e['schema:name'] ?? '', 
          episodeNumber: e['schema:episodeNumber'] ?? '', 
          hasPart: e['gh:hasPart'] ? JSON.parse(e['gh:hasPart']) : [], 
          createdAt: new Date(e.createdAt), 
          updatedAt: new Date(e.updatedAt) 
        } as EpisodeNode;
      });
    } finally {
      await session.close();
    }
  }

  // Characters: save list and link to project
  async saveCharacters(projectId: string, characters: CharacterItem[]) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const projectIdParam = new Cypher.Param(projectId);
      const nowParam = new Cypher.Param(now);

      for (const ch of characters) {
        const project = new Cypher.Node();
        const character = new Cypher.Node();

        const characterId = `${projectId}:character:${ch.name}`;

        const query = new Cypher.Match(
                new Cypher.Pattern(project, { properties: { id: projectIdParam } })
            )
            .merge(
                new Cypher.Pattern(character, {
                    properties: { id: new Cypher.Param(characterId) }
                })
            )
            .onCreateSet([
                character,
                new Cypher.Map({
                    'schema:name': new Cypher.Param(ch.name),
                    'gh:role': new Cypher.Param(ch.role),
                    'gh:motivation': new Cypher.Param(ch.motivation ?? null),
                    'gh:conflict': new Cypher.Param(ch.conflict ?? null),
                    'gh:voice': new Cypher.Param(ch.voice ?? null),
                    createdAt: nowParam,
                    updatedAt: nowParam
                })
            ])
            .onMatchSet([
                character,
                new Cypher.Map({
                    'schema:name': new Cypher.Param(ch.name),
                    'gh:role': new Cypher.Param(ch.role),
                    'gh:motivation': new Cypher.Param(ch.motivation ?? null),
                    'gh:conflict': new Cypher.Param(ch.conflict ?? null),
                    'gh:voice': new Cypher.Param(ch.voice ?? null),
                    updatedAt: nowParam
                })
            ])
            .with(project, character)
            .merge(
                // @ts-expect-error - cypher-builder types are incorrect
                new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_CHARACTER" })).to(character)
            )
            .return(character);

        const { cypher, params } = query.build();
        await session.run(cypher, params);
      }
      return { ok: true as const };
    } finally {
      await session.close();
    }
  }

  async saveBackstories(projectId: string, backstories: BackstoryItem[]) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const projectIdParam = new Cypher.Param(projectId);
      const nowParam = new Cypher.Param(now);

      for (const b of backstories) {
        const bid = `${projectId}:backstory:${b.origin.slice(0, 24)}`;
        const project = new Cypher.Node();
        const backstory = new Cypher.Node();

        const query = new Cypher.Match(
                new Cypher.Pattern(project, { properties: { id: projectIdParam } })
            )
            .merge(
                new Cypher.Pattern(backstory, {
                    properties: { id: new Cypher.Param(bid) }
                })
            )
            .onCreateSet([
                backstory,
                new Cypher.Map({
                    'gh:origin': new Cypher.Param(b.origin),
                    'gh:motivation': new Cypher.Param(b.motivation ?? null),
                    'gh:conflict': new Cypher.Param(b.conflict ?? null),
                    createdAt: nowParam,
                    updatedAt: nowParam
                })
            ])
            .onMatchSet([
                backstory,
                new Cypher.Map({
                    'gh:origin': new Cypher.Param(b.origin),
                    'gh:motivation': new Cypher.Param(b.motivation ?? null),
                    'gh:conflict': new Cypher.Param(b.conflict ?? null),
                    updatedAt: nowParam
                })
            ])
            .with(project, backstory)
            .merge(
                // @ts-expect-error - cypher-builder types are incorrect
                new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_BACKSTORY" })).to(backstory)
            )
            .return(backstory);

        const { cypher, params } = query.build();
        await session.run(cypher, params);

        if (b.characterName) {
          const cid = `${projectId}:character:${b.characterName}`;
          const character = new Cypher.Node();

          const linkQuery = new Cypher.Match(
              new Cypher.Pattern(character)
                  .where(Cypher.eq(character.property("id"), new Cypher.Param(cid)))
                  .related(new Cypher.Relationship()).to(backstory)
          )
          .where(Cypher.eq(backstory.property("id"), new Cypher.Param(bid)))
          .merge(
              new Cypher.Pattern(character).related(new Cypher.Relationship()).to(backstory)
          );

          const { cypher: linkCypher, params: linkParams } = linkQuery.build();
          await session.run(linkCypher, linkParams);
        }
      }
      return { ok: true as const };
    } finally {
      await session.close();
    }
  }

  async getCharacters(projectId: string): Promise<CharacterItem[]> {
    const session = this.driver.session();
    try {
      const project = new Cypher.Node();
      const character = new Cypher.Node();

      const matchQuery = new Cypher.Match(
                new Cypher.Pattern(project).related(new Cypher.Relationship()).to(character)
      )
      .return([character, 'c'])
      .orderBy([character.property("schema:name"), "ASC"]);

      const { cypher, params } = matchQuery.build();
      const res = await session.run(cypher, params);

      return res.records.map(r => {
        const c = r.get("c").properties;
        return { name: c['schema:name'] as string, role: c['gh:role'] as CharacterItem['role'], motivation: c['gh:motivation'] as string | undefined, conflict: c['gh:conflict'] as string | undefined, voice: c['gh:voice'] as string | undefined };
      });
    } finally {
      await session.close();
    }
  }

  async getBackstories(projectId: string): Promise<BackstoryItem[]> {
    const session = this.driver.session();
    try {
      const project = new Cypher.Node();
      const backstory = new Cypher.Node();

      const matchQuery = new Cypher.Match(
                // @ts-expect-error - cypher-builder types are incorrect
                new Cypher.Pattern(project, { labels: ["Project"], properties: { id: new Cypher.Param(projectId) } }).related(new Cypher.Relationship({ type: "HAS_BACKSTORY" })).to(backstory)
      )
      .return([backstory, 'b'])
      .orderBy([backstory.property("updatedAt"), "DESC"]);

      const { cypher, params } = matchQuery.build();
      const res = await session.run(cypher, params);

      return res.records.map(r => {
        const b = r.get("b").properties;
        return { origin: b['gh:origin'] as string, motivation: b['gh:motivation'] as string | undefined, conflict: b['gh:conflict'] as string | undefined };
      });
    } finally {
      await session.close();
    }
  }

  async getStyles(projectId: string): Promise<{
    visual: { artStyle: (typeof ART_STYLES)[number]; palette: (typeof PALETTES)[number]; nsfwAllowed: boolean };
    audio: { voice: (typeof VOICES)[number]; tempo: (typeof TEMPOS)[number]; musicMood: (typeof MUSIC)[number] };
  } | null> {
    const session = this.driver.session();
    try {
      const project = new Cypher.Node();
      const styles = new Cypher.Node();

      const query = new Cypher.Match(
          // @ts-expect-error - cypher-builder types are incorrect
          new Cypher.Pattern(project, { properties: { id: new Cypher.Param(projectId) } }).related(new Cypher.Relationship({ type: "HAS_STYLES" })).to(styles)
      )
      .return([styles, 'styles']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);
      if (result.records.length === 0) return null;
      return result.records[0].get('styles').properties as {
        visual: { artStyle: (typeof ART_STYLES)[number]; palette: (typeof PALETTES)[number]; nsfwAllowed: boolean };
        audio: { voice: (typeof VOICES)[number]; tempo: (typeof TEMPOS)[number]; musicMood: (typeof MUSIC)[number] };
      };
    } finally {
      await session.close();
    }
  }

  // Get project by ID
  async getProject(id: string): Promise<ProjectNode | null> {
    const session = this.driver.session();

    try {
      const project = new Cypher.Node();

      const query = new Cypher.Match(
          new Cypher.Pattern(project, {
              labels: ["Project"],
              properties: { id: new Cypher.Param(id) }
          })
      )
      .return([project, 'project']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const props = record.get('project').properties;

      return {
        id: props.id,
        title: props.title,
        logline: props.logline,
        genres: props.genres,
        tone: props.tone,
        audienceRating: props.audienceRating,
        language: props.language,
        keywords: props.keywords,
        createdAt: new Date(props.createdAt),
        updatedAt: new Date(props.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  // Save narrative and link to project
  async saveNarrative(projectId: string, narrative: Omit<NarrativeNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<NarrativeNode> {
    const session = this.driver.session();

    try {
      const now = new Date();
      const narrativeId = narrative.id || crypto.randomUUID();

      const project = new Cypher.Node();
      const narrativeNode = new Cypher.Node();

      const query = new Cypher.Match(
              new Cypher.Pattern(project, { properties: { id: new Cypher.Param(projectId) } })
          )
          .merge(
              new Cypher.Pattern(narrativeNode, {
                  properties: { id: new Cypher.Param(narrativeId) }
              })
          )
          .onCreateSet([
              narrativeNode,
              new Cypher.Map({
                  synopsis: new Cypher.Param(narrative.synopsis),
                  structure: new Cypher.Param(narrative.structure),
                  beats: new Cypher.Param(narrative.beats),
                  createdAt: new Cypher.Param(now.toISOString()),
                  updatedAt: new Cypher.Param(now.toISOString()),
              })
          ])
          .onMatchSet([
              narrativeNode,
              new Cypher.Map({
                  synopsis: new Cypher.Param(narrative.synopsis),
                  structure: new Cypher.Param(narrative.structure),
                  beats: new Cypher.Param(narrative.beats),
                  updatedAt: new Cypher.Param(now.toISOString()),
              })
          ])
          .with(project, narrativeNode)
          .merge(
              // @ts-expect-error - cypher-builder types are incorrect
              new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_NARRATIVE" })).to(narrativeNode)
          )
          .return([narrativeNode, 'narrativeNode']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);

      const record = result.records[0];
      const props = record.get('narrativeNode').properties;

      return {
        id: props.id,
        synopsis: props.synopsis,
        structure: props.structure,
        beats: props.beats,
        createdAt: new Date(props.createdAt),
        updatedAt: new Date(props.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  // Get narrative for project
  async getNarrative(projectId: string): Promise<NarrativeNode | null> {
    const session = this.driver.session();

    try {
      const project = new Cypher.Node();
      const narrative = new Cypher.Node();

      const query = new Cypher.Match(
          // @ts-expect-error - cypher-builder types are incorrect
          new Cypher.Pattern(project, { properties: { id: new Cypher.Param(projectId) } }).related(new Cypher.Relationship({ type: "HAS_NARRATIVE" })).to(narrative)
      )
      .return([narrative, 'narrative']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const props = record.get('narrative').properties;

      return {
        id: props.id,
        synopsis: props.synopsis,
        structure: props.structure,
        beats: props.beats,
        createdAt: new Date(props.createdAt),
        updatedAt: new Date(props.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  // Get all projects (for listing)
  async getAllProjects(): Promise<ProjectNode[]> {
    const session = this.driver.session();

    try {
      const project = new Cypher.Node();

      const query = new Cypher.Match(new Cypher.Pattern(project))
          .return([project, 'project'])
          .orderBy([project.property("updatedAt"), "DESC"]);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);

      return result.records.map(record => {
        const props = record.get('project').properties;
        return {
          id: props.id,
          title: props.title,
          logline: props.logline,
          genres: props.genres,
          tone: props.tone,
          audienceRating: props.audienceRating,
          language: props.language,
          keywords: props.keywords,
          createdAt: new Date(props.createdAt),
          updatedAt: new Date(props.updatedAt),
        };
      });
    } finally {
      await session.close();
    }
  }

  // Save platforms and link to project
  async savePlatforms(projectId: string, data: {
    wattpad: { chapterCount: number; includeImages: boolean; chapterLengthWords?: [number, number]; imageFrequency: string };
    webtoon: { episodePanels: number; bubbleDensity: string; readingPace: string; soundEffects: boolean };
    youtube: { targetDurationSec: number; aspectRatio: string; captions: boolean; brollRatio: number };
  }) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const projectIdParam = new Cypher.Param(projectId);
      const nowParam = new Cypher.Param(now);

      const project = new Cypher.Node();
      const platformsNode = new Cypher.Node();
      const platformsId = `${projectId}-platforms`;

      const query = new Cypher.Match(
              new Cypher.Pattern(project, { properties: { id: projectIdParam } })
          )
          .merge(
              new Cypher.Pattern(platformsNode, {
                  properties: { id: new Cypher.Param(platformsId) }
              })
          )
          .onCreateSet([
              platformsNode,
              new Cypher.Map({
                  wattpad: new Cypher.Param(data.wattpad),
                  webtoon: new Cypher.Param(data.webtoon),
                  youtube: new Cypher.Param(data.youtube),
                  createdAt: nowParam,
                  updatedAt: nowParam
              })
          ])
          .onMatchSet([
              platformsNode,
              new Cypher.Map({
                  wattpad: new Cypher.Param(data.wattpad),
                  webtoon: new Cypher.Param(data.webtoon),
                  youtube: new Cypher.Param(data.youtube),
                  updatedAt: nowParam
              })
          ])
          .with(project, platformsNode)
          .merge(
              // @ts-expect-error - cypher-builder types are incorrect
              new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_PLATFORMS" })).to(platformsNode)
          )
          .return([platformsNode, 'platformsNode']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);
      return result.records[0]?.get('platformsNode').properties ?? null;
    } finally {
      await session.close();
    }
  }

  async getPlatforms(projectId: string) {
    const session = this.driver.session();
    try {
      const project = new Cypher.Node();
      const platforms = new Cypher.Node();

      const query = new Cypher.Match(
          // @ts-expect-error - cypher-builder types are incorrect
          new Cypher.Pattern(project, { properties: { id: new Cypher.Param(projectId) } }).related(new Cypher.Relationship({ type: "HAS_PLATFORMS" })).to(platforms)
      )
      .return([platforms, 'platforms']);

      const { cypher, params } = query.build();
      console.log('Generated Cypher:', cypher);
      console.log('Params:', params);
      const result = await session.run(cypher, params);
      if (result.records.length === 0) return null;
      return result.records[0].get('platforms').properties;
    } finally {
      await session.close();
    }
  }

  // Save canvas config JSON and link to project
  async saveCanvas(projectId: string, config: { nodes: unknown[]; edges: unknown[] }) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const projectIdParam = new Cypher.Param(projectId);
      const nowParam = new Cypher.Param(now);

      const project = new Cypher.Node();
      const canvasNode = new Cypher.Node();
      const canvasId = `${projectId}-canvas`;

      const query = new Cypher.Match(
              new Cypher.Pattern(project, { properties: { id: projectIdParam } })
          )
          .merge(
              new Cypher.Pattern(canvasNode, {
                  properties: { id: new Cypher.Param(canvasId) }
              })
          )
          .onCreateSet([
              canvasNode,
              new Cypher.Map({
                  config: new Cypher.Param(config),
                  createdAt: nowParam,
                  updatedAt: nowParam
              })
          ])
          .onMatchSet([
              canvasNode,
              new Cypher.Map({
                  config: new Cypher.Param(config),
                  updatedAt: nowParam
              })
          ])
          .with(project, canvasNode)
          .merge(
              // @ts-expect-error - cypher-builder types are incorrect
              new Cypher.Pattern(project).related(new Cypher.Relationship({ type: "HAS_CANVAS" })).to(canvasNode)
          )
          .return([canvasNode, 'canvasNode']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);
      return result.records[0]?.get('canvasNode').properties ?? null;
    } finally {
      await session.close();
    }
  }

  async getCanvas(projectId: string): Promise<{ nodes: unknown[]; edges: unknown[] } | null> {
    const session = this.driver.session();
    try {
      const project = new Cypher.Node();
      const canvas = new Cypher.Node();

      const query = new Cypher.Match(
          // @ts-expect-error - cypher-builder types are incorrect
          new Cypher.Pattern(project, { properties: { id: new Cypher.Param(projectId) } }).related(new Cypher.Relationship({ type: "HAS_CANVAS" })).to(canvas)
      )
      .return([canvas, 'canvas']);

      const { cypher, params } = query.build();
      const result = await session.run(cypher, params);
      if (result.records.length === 0) return null;
      const props = result.records[0].get('canvas').properties;
      return props.config as { nodes: unknown[]; edges: unknown[] };
    } finally {
      await session.close();
    }
  }

  async getStoryGraph(): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
      `;
      const result = await session.run(query);

      const nodes = new Map<string, Record<string, unknown>>();
      const edges: Record<string, unknown>[] = [];

      for (const record of result.records) {
        const nodeN = record.get('n');
        const rel = record.get('r');
        const nodeM = record.get('m');

        if (nodeN && !nodes.has(nodeN.identity.toString())) {
          nodes.set(nodeN.identity.toString(), {
            id: nodeN.properties.id || nodeN.identity.toString(),
            ...nodeN.properties,
            labels: nodeN.labels,
          });
        }

        if (nodeM && !nodes.has(nodeM.identity.toString())) {
          nodes.set(nodeM.identity.toString(), {
            id: nodeM.properties.id || nodeM.identity.toString(),
            ...nodeM.properties,
            labels: nodeM.labels,
          });
        }

        if (rel) {
          edges.push({
            id: rel.identity.toString(),
            source: rel.start.toString(),
            target: rel.end.toString(),
            type: rel.type,
            ...rel.properties,
          });
        }
      }

      return { nodes: Array.from(nodes.values()), edges };
    } finally {
      await session.close();
    }
  }
}

// Singleton instance
export const storyRepository = new StoryNeo4jRepository();
