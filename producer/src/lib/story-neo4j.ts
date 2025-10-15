import { getNeo4jDriver } from './neo4j';

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
}

// Singleton instance
export const storyRepository = new StoryNeo4jRepository();
