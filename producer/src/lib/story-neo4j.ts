import { getNeo4jDriver } from '../infra/neo4j/client';
import * as Cypher from '@neo4j/cypher-builder';

// Merkle DAG: story-neo4j -> neo4j-driver -> cypher-builder
// Story data persistence layer using Neo4j graph database

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
    purpose: string;
    targetLength: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EpisodeNode {
  id: string;
  episodeId: string;
  sourcePath: string;
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

export class StoryNeo4jRepository {
  private driver = getNeo4jDriver();

  // Create or update project
  async saveProject(project: Omit<ProjectNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ProjectNode> {
    const session = this.driver.session();

    try {
      const now = new Date();
      const projectId = project.id || crypto.randomUUID();

      // Note: using raw cypher below; Node builder kept for future reference and intentionally removed to satisfy linter

      const query = `
        MERGE (p:Project {id: $id})
        SET p += {
          title: $title,
          logline: $logline,
          genres: $genres,
          tone: $tone,
          audienceRating: $audienceRating,
          language: $language,
          keywords: $keywords,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        }
        RETURN p
      `;

      const result = await session.run(query, {
        id: projectId,
        title: project.title,
        logline: project.logline,
        genres: project.genres,
        tone: project.tone,
        audienceRating: project.audienceRating,
        language: project.language,
        keywords: project.keywords,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      const record = result.records[0];

      return {
        id: record.get('p').properties.id,
        title: record.get('p').properties.title,
        logline: record.get('p').properties.logline,
        genres: record.get('p').properties.genres,
        tone: record.get('p').properties.tone,
        audienceRating: record.get('p').properties.audienceRating,
        language: record.get('p').properties.language,
        keywords: record.get('p').properties.keywords,
        createdAt: new Date(record.get('p').properties.createdAt),
        updatedAt: new Date(record.get('p').properties.updatedAt),
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
      const query = `
        MATCH (p:Project {id: $projectId})
        MERGE (s:Styles {id: $id})
        ON CREATE SET s += { visual: $visual, audio: $audio, createdAt: $now, updatedAt: $now }
        ON MATCH SET  s += { visual: $visual, audio: $audio, updatedAt: $now }
        MERGE (p)-[:HAS_STYLES]->(s)
        RETURN s
      `;
      const params = {
        projectId,
        id: `${projectId}-styles`,
        visual: styles.visual,
        audio: styles.audio,
        now,
      };
      const result = await session.run(query, params);
      return result.records[0]?.get('s').properties ?? null;
    } finally {
      await session.close();
    }
  }

  // Episodes: save list and link to project
  async saveEpisodes(projectId: string, episodes: { episodeId: string; sourcePath: string }[]) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      for (const ep of episodes) {
        const q = `
          MATCH (p:Project {id: $projectId})
          MERGE (e:Episode {id: $id})
          ON CREATE SET e += { episodeId: $episodeId, sourcePath: $sourcePath, createdAt: $now, updatedAt: $now }
          ON MATCH SET  e += { episodeId: $episodeId, sourcePath: $sourcePath, updatedAt: $now }
          MERGE (p)-[:HAS_EPISODE]->(e)
          RETURN e
        `;
        await session.run(q, { projectId, id: `${projectId}:${ep.episodeId}`, episodeId: ep.episodeId, sourcePath: ep.sourcePath, now });
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
        new Cypher.Pattern(project, {labels: ["Project"], properties: { id: new Cypher.Param(projectId) }})
          .related(new Cypher.Relationship())
          .to(episode, {labels: ["gh:Episode"]})
      )
      .return([episode, 'e'])
      .orderBy([episode.property("episodeId"), "ASC"]);

      const { cypher, params } = matchQuery.build();
      const res = await session.run(cypher, params);

      return res.records.map(r => {
        const e = r.get("e").properties;
        return { id: e.id, episodeId: e.episodeId, sourcePath: e.sourcePath, createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) } as EpisodeNode;
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
      for (const ch of characters) {
        const q = `
          MATCH (p:Project {id: $projectId})
          MERGE (c:Character {id: $id})
          ON CREATE SET c += { name: $name, role: $role, motivation: $motivation, conflict: $conflict, voice: $voice, createdAt: $now, updatedAt: $now }
          ON MATCH SET  c += { name: $name, role: $role, motivation: $motivation, conflict: $conflict, voice: $voice, updatedAt: $now }
          MERGE (p)-[:HAS_CHARACTER]->(c)
          RETURN c
        `;
        await session.run(q, { projectId, id: `${projectId}:character:${ch.name}`, name: ch.name, role: ch.role, motivation: ch.motivation ?? null, conflict: ch.conflict ?? null, voice: ch.voice ?? null, now });
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
      for (const b of backstories) {
        const bid = `${projectId}:backstory:${b.origin.slice(0, 24)}`;
        const q = `
          MATCH (p:Project {id: $projectId})
          MERGE (b:Backstory {id: $id})
          ON CREATE SET b += { origin: $origin, motivation: $motivation, conflict: $conflict, createdAt: $now, updatedAt: $now }
          ON MATCH SET  b += { origin: $origin, motivation: $motivation, conflict: $conflict, updatedAt: $now }
          MERGE (p)-[:HAS_BACKSTORY]->(b)
          RETURN b
        `;
        await session.run(q, { projectId, id: bid, origin: b.origin, motivation: b.motivation ?? null, conflict: b.conflict ?? null, now });
        if (b.characterName) {
          const link = `
            MATCH (c:Character {id: $cid}), (b:Backstory {id: $bid})
            MERGE (c)-[:HAS_BACKSTORY]->(b)
          `;
          const cid = `${projectId}:character:${b.characterName}`;
          await session.run(link, { cid, bid });
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
        new Cypher.Pattern(project, {labels: ["Project"], properties: { id: new Cypher.Param(projectId) }})
          .related(new Cypher.Relationship())
          .to(character, {labels: ["gh:Character"]})
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
        new Cypher.Pattern(project, {labels: ["Project"], properties: { id: new Cypher.Param(projectId) }})
          .related(new Cypher.Relationship())
          .to(backstory, {labels: ["gh:Backstory"]})
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
    visual: { artStyle: string; palette: string; nsfwAllowed: boolean };
    audio: { voice: string; tempo: string; musicMood: string };
  } | null> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (p:Project {id: $projectId})-[:HAS_STYLES]->(s:Styles)
        RETURN s
      `;
      const result = await session.run(query, { projectId });
      if (result.records.length === 0) return null;
      return result.records[0].get('s').properties as {
        visual: { artStyle: string; palette: string; nsfwAllowed: boolean };
        audio: { voice: string; tempo: string; musicMood: string };
      };
    } finally {
      await session.close();
    }
  }

  // Get project by ID
  async getProject(id: string): Promise<ProjectNode | null> {
    const session = this.driver.session();

    try {
      const query = `
        MATCH (p:Project {id: $id})
        RETURN p
      `;

      const result = await session.run(query, { id });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const props = record.get('p').properties;

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

      const query = `
        MATCH (p:Project {id: $projectId})
        MERGE (n:Narrative {id: $narrativeId})
        ON CREATE SET n += {
          synopsis: $synopsis,
          structure: $structure,
          beats: $beats,
          createdAt: $now,
          updatedAt: $now
        }
        ON MATCH SET n += {
          synopsis: $synopsis,
          structure: $structure,
          beats: $beats,
          updatedAt: $now
        }
        MERGE (p)-[:HAS_NARRATIVE]->(n)
        RETURN n
      `;

      const result = await session.run(query, {
        projectId,
        narrativeId,
        synopsis: narrative.synopsis,
        structure: narrative.structure,
        beats: narrative.beats,
        now: now.toISOString(),
      });

      const record = result.records[0];
      const props = record.get('n').properties;

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
      const query = `
        MATCH (p:Project {id: $projectId})-[:HAS_NARRATIVE]->(n:Narrative)
        RETURN n
      `;

      const result = await session.run(query, { projectId });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const props = record.get('n').properties;

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
      const query = `
        MATCH (p:Project)
        RETURN p
        ORDER BY p.updatedAt DESC
      `;

      const result = await session.run(query);

      return result.records.map(record => {
        const props = record.get('p').properties;
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
      const query = `
        MATCH (p:Project {id: $projectId})
        MERGE (pl:Platforms {id: $id})
        ON CREATE SET pl += { wattpad: $wattpad, webtoon: $webtoon, youtube: $youtube, createdAt: $now, updatedAt: $now }
        ON MATCH SET pl += { wattpad: $wattpad, webtoon: $webtoon, youtube: $youtube, updatedAt: $now }
        MERGE (p)-[:HAS_PLATFORMS]->(pl)
        RETURN pl
      `;
      const params = {
        projectId,
        id: `${projectId}-platforms`,
        wattpad: data.wattpad,
        webtoon: data.webtoon,
        youtube: data.youtube,
        now,
      };
      const result = await session.run(query, params);
      return result.records[0]?.get('pl').properties ?? null;
    } finally {
      await session.close();
    }
  }

  async getPlatforms(projectId: string) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (p:Project {id: $projectId})-[:HAS_PLATFORMS]->(pl:Platforms)
        RETURN pl
      `;
      const result = await session.run(query, { projectId });
      if (result.records.length === 0) return null;
      return result.records[0].get('pl').properties;
    } finally {
      await session.close();
    }
  }

  // Save canvas config JSON and link to project
  async saveCanvas(projectId: string, config: { nodes: unknown[]; edges: unknown[] }) {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const query = `
        MATCH (p:Project {id: $projectId})
        MERGE (c:Canvas {id: $id})
        ON CREATE SET c += { config: $config, createdAt: $now, updatedAt: $now }
        ON MATCH SET c += { config: $config, updatedAt: $now }
        MERGE (p)-[:HAS_CANVAS]->(c)
        RETURN c
      `;
      const params = {
        projectId,
        id: `${projectId}-canvas`,
        config,
        now,
      };
      const result = await session.run(query, params);
      return result.records[0]?.get('c').properties ?? null;
    } finally {
      await session.close();
    }
  }

  async getCanvas(projectId: string): Promise<{ nodes: unknown[]; edges: unknown[] } | null> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (p:Project {id: $projectId})-[:HAS_CANVAS]->(c:Canvas)
        RETURN c
      `;
      const result = await session.run(query, { projectId });
      if (result.records.length === 0) return null;
      const props = result.records[0].get('c').properties;
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
