import { GraphQLClient } from 'graphql-request';

const GRAPHQL_ENDPOINT = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8081/graphql')
    : (process.env.GRAPHQL_API_URL || 'http://localhost:8081/graphql');

export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// GraphQL Queries
export const queries = {
  project: `
    query GetProject($id: ID!) {
      project(id: $id) {
        id
        title
        logline
        genres
        tone
        audienceRating
        language
        keywords
        createdAt
        updatedAt
      }
    }
  `,
  projects: `
    query GetProjects {
      projects {
        id
        title
        logline
        genres
        tone
        audienceRating
        language
        keywords
        createdAt
        updatedAt
      }
    }
  `,
  narrative: `
    query GetNarrative($projectId: ID!) {
      narrative(projectId: $projectId) {
        id
        projectId
        synopsis
        structure
        beats {
          id
          label
          purpose
          targetLength
        }
        createdAt
        updatedAt
      }
    }
  `,
  characters: `
    query GetCharacters($projectId: ID!) {
      characters(projectId: $projectId) {
        id
        projectId
        name
        role
        motivation
        conflict
        voice
        createdAt
        updatedAt
      }
    }
  `,
  backstories: `
    query GetBackstories($projectId: ID!) {
      backstories(projectId: $projectId) {
        id
        projectId
        characterId
        origin
        motivation
        conflict
        createdAt
        updatedAt
      }
    }
  `,
  episodes: `
    query GetEpisodes($projectId: ID!) {
      episodes(projectId: $projectId) {
        id
        projectId
        episodeId
        name
        episodeNumber
        sourcePath
        hasPart {
          type
          contentUrl
          name
          description
        }
        createdAt
        updatedAt
      }
    }
  `,
  styles: `
    query GetStyles($projectId: ID!) {
      styles(projectId: $projectId) {
        id
        projectId
        visual {
          artStyle
          palette
          nsfwAllowed
        }
        audio {
          voice
          tempo
          musicMood
        }
        createdAt
        updatedAt
      }
    }
  `,
  platforms: `
    query GetPlatforms($projectId: ID!) {
      platforms(projectId: $projectId) {
        id
        projectId
        wattpad {
          chapterCount
          includeImages
          chapterLengthWords
          imageFrequency
        }
        webtoon {
          episodePanels
          bubbleDensity
          readingPace
          soundEffects
        }
        youtube {
          targetDurationSec
          aspectRatio
          captions
          brollRatio
        }
        createdAt
        updatedAt
      }
    }
  `,
  canvas: `
    query GetCanvas($projectId: ID!) {
      canvas(projectId: $projectId) {
        id
        projectId
        config
        createdAt
        updatedAt
      }
    }
  `,
  storyGraph: `
    query GetStoryGraph($projectId: ID!) {
      storyGraph(projectId: $projectId) {
        nodes
        edges
      }
    }
  `,
  pipelineTopology: `
    query GetPipelineTopology {
      pipelineTopology {
        pipeline
        executionOrder
        resources
        validation
        observability
        storage
        outputs
      }
    }
  `,
};

// GraphQL Mutations
export const mutations = {
  createProject: `
    mutation CreateProject($input: ProjectInput!) {
      createProject(input: $input) {
        id
        title
        logline
        genres
        tone
        audienceRating
        language
        keywords
        createdAt
        updatedAt
      }
    }
  `,
  updateProject: `
    mutation UpdateProject($id: ID!, $input: ProjectInput!) {
      updateProject(id: $id, input: $input) {
        id
        title
        logline
        genres
        tone
        audienceRating
        language
        keywords
        createdAt
        updatedAt
      }
    }
  `,
  saveNarrative: `
    mutation SaveNarrative($projectId: ID!, $input: NarrativeInput!) {
      saveNarrative(projectId: $projectId, input: $input) {
        id
        projectId
        synopsis
        structure
        beats {
          id
          label
          purpose
          targetLength
        }
        createdAt
        updatedAt
      }
    }
  `,
  saveCharacters: `
    mutation SaveCharacters($projectId: ID!, $input: [CharacterInput!]!) {
      saveCharacters(projectId: $projectId, input: $input) {
        id
        projectId
        name
        role
        motivation
        conflict
        voice
        createdAt
        updatedAt
      }
    }
  `,
  saveBackstories: `
    mutation SaveBackstories($projectId: ID!, $input: [BackstoryInput!]!) {
      saveBackstories(projectId: $projectId, input: $input) {
        id
        projectId
        characterId
        origin
        motivation
        conflict
        createdAt
        updatedAt
      }
    }
  `,
  saveEpisodes: `
    mutation SaveEpisodes($projectId: ID!, $input: [EpisodeInput!]!) {
      saveEpisodes(projectId: $projectId, input: $input) {
        id
        projectId
        episodeId
        name
        episodeNumber
        sourcePath
        hasPart {
          type
          contentUrl
          name
          description
        }
        createdAt
        updatedAt
      }
    }
  `,
  saveStyles: `
    mutation SaveStyles($projectId: ID!, $input: StyleInput!) {
      saveStyles(projectId: $projectId, input: $input) {
        id
        projectId
        visual {
          artStyle
          palette
          nsfwAllowed
        }
        audio {
          voice
          tempo
          musicMood
        }
        createdAt
        updatedAt
      }
    }
  `,
  savePlatforms: `
    mutation SavePlatforms($projectId: ID!, $input: PlatformInput!) {
      savePlatforms(projectId: $projectId, input: $input) {
        id
        projectId
        wattpad {
          chapterCount
          includeImages
          chapterLengthWords
          imageFrequency
        }
        webtoon {
          episodePanels
          bubbleDensity
          readingPace
          soundEffects
        }
        youtube {
          targetDurationSec
          aspectRatio
          captions
          brollRatio
        }
        createdAt
        updatedAt
      }
    }
  `,
  saveCanvas: `
    mutation SaveCanvas($projectId: ID!, $input: CanvasInput!) {
      saveCanvas(projectId: $projectId, input: $input) {
        id
        projectId
        config
        createdAt
        updatedAt
      }
    }
  `,
  runPipeline: `
    mutation RunPipeline($input: PipelineInput!) {
      runPipeline(input: $input) {
        ok
        executionId
      }
    }
  `,
};

