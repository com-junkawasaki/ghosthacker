import { getNeo4jDriver } from './neo4j';
import { cypher, Node, Relationship } from '@neo4j/cypher-builder';

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

      // Use raw Cypher query for now
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

      console.log('Raw Cypher query:', query);
      console.log('Raw Cypher params:', {
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
      const projectNode = new Node({ labels: ['Project'] }); // used below in cypher builder chain

      const matchQuery = cypher
        .match(projectNode)
        .where(projectNode, { id })
        .returning(projectNode);

      const result = await session.run(matchQuery.build(), matchQuery.getParams());

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

      const projectNode = new Node({ labels: ['Project'] });
      const narrativeNode = new Node({
        labels: ['Narrative'],
        properties: {
          id: narrativeId,
          synopsis: narrative.synopsis,
          structure: narrative.structure,
          beats: narrative.beats,
          createdAt: now,
          updatedAt: now,
        }
      });

      // Relationship: Project -> HAS_NARRATIVE -> Narrative
      const hasNarrativeRel = new Relationship({
        source: projectNode,
        target: narrativeNode,
        type: 'HAS_NARRATIVE',
      });

      const mergeQuery = cypher
        .match(projectNode)
        .where(projectNode, { id: projectId })
        .merge([hasNarrativeRel])
        .set({
          updatedAt: now,
        })
        .returning(narrativeNode);

      const result = await session.run(mergeQuery.build(), mergeQuery.getParams());
      const record = result.records[0];

      return {
        id: record.get('narrative').properties.id,
        synopsis: record.get('narrative').properties.synopsis,
        structure: record.get('narrative').properties.structure,
        beats: record.get('narrative').properties.beats,
        createdAt: new Date(record.get('narrative').properties.createdAt),
        updatedAt: new Date(record.get('narrative').properties.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  // Get narrative for project
  async getNarrative(projectId: string): Promise<NarrativeNode | null> {
    const session = this.driver.session();

    try {
      const projectNode = new Node({ labels: ['Project'] });
      const narrativeNode = new Node({ labels: ['Narrative'] });
      const hasNarrativeRel = new Relationship({
        source: projectNode,
        target: narrativeNode,
        type: 'HAS_NARRATIVE',
      });

      const matchQuery = cypher
        .match([projectNode, hasNarrativeRel, narrativeNode])
        .where(projectNode, { id: projectId })
        .returning(narrativeNode);

      const result = await session.run(matchQuery.build(), matchQuery.getParams());

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
      const projectNode = new Node({ labels: ['Project'] });

      const matchQuery = cypher
        .match(projectNode)
        .returning(projectNode)
        .orderBy([cypher.desc(projectNode.property('updatedAt'))]);

      const result = await session.run(matchQuery.build(), matchQuery.getParams());

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
}

// Singleton instance
export const storyRepository = new StoryNeo4jRepository();
