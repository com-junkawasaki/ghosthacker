/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/edit-epub-content
 * 
 * GraphQL queries for EPUB operations
 */
import gql from 'graphql-tag';

export const GET_EPUB = gql`
  query GetEpub($id: ID!) {
    epub(id: $id) {
      id
      title
      language
      createdAt
      updatedAt
      chapters {
        id
        title
        order
        contentHtml
        media {
          id
          type
          url
          mimeType
          fileSize
        }
      }
      metadata {
        key
        value
      }
    }
  }
`;

export const LIST_EPUBS = gql`
  query ListEpubs {
    epubList {
      id
      title
      language
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHAPTER = gql`
  query GetChapter($id: ID!) {
    chapter(id: $id) {
      id
      title
      order
      contentHtml
      paragraphs {
        id
        order
        contentHtml
      }
      media {
        id
        type
        url
        mimeType
        fileSize
      }
    }
  }
`;

export const GET_CHAPTERS = gql`
  query GetChapters($epubId: ID!) {
    chapters(epubId: $epubId) {
      id
      title
      order
      contentHtml
    }
  }
`;

// JSON-LDノードクエリ
export const GET_CHARACTERS = gql`
  query GetCharacters {
    characters {
      id
      characterId
      name
      callsign
      description
      age
      occupation
      role
      virtue
      alternateName
      imageBase64
    }
  }
`;

export const GET_GHOSTS = gql`
  query GetGhosts {
    ghosts {
      id
      ghostId
      name
      ghostType
      description
      master
      createdBy
    }
  }
`;

export const GET_LOCATIONS = gql`
  query GetLocations {
    locations {
      id
      locationId
      name
      description
      year
      hazardNote
      operationalNote
      securityNote
    }
  }
`;

export const GET_ORGANIZATIONS = gql`
  query GetOrganizations {
    organizations {
      id
      organizationId
      name
      description
      founder
      companyType
      infraNote
      operationalNote
      securityNote
    }
  }
`;

export const GET_COMPANIES = gql`
  query GetCompanies {
    companies {
      id
      companyId
      name
      description
      founder
      companyType
      infraNote
      operationalNote
      securityNote
    }
  }
`;

export const GET_TECHNOLOGIES = gql`
  query GetTechnologies {
    technologies {
      id
      technologyId
      name
      description
      certification
      infraNote
      operationalNote
      securityNote
    }
  }
`;

export const GET_EPISODES = gql`
  query GetEpisodes {
    episodes {
      id
      episodeId
      episodeNumber
      season
      name
      logline
      hasArc
      hasScene
      hasCharacter
      motifRefs
      antagonist
    }
  }
`;

export const GET_SCENES = gql`
  query GetScenes {
    scenes {
      id
      sceneId
      name
      sameAs
      description
    }
  }
`;

export const GET_ARCS = gql`
  query GetArcs {
    arcs {
      id
      arcId
      name
      spansSeasons
      phase
      description
    }
  }
`;

export const GET_MOTIFS = gql`
  query GetMotifs {
    motifs {
      id
      motifId
      name
      theme
      source
      description
    }
  }
`;

export const GET_SEASONS = gql`
  query GetSeasons {
    seasons {
      id
      seasonId
      name
      theme
      featuredThemes
      source
    }
  }
`;

export const GET_TIMELINES = gql`
  query GetTimelines {
    timelines {
      id
      timelineId
      name
      description
      influences
      source
    }
  }
`;

export const GET_EVENTS = gql`
  query GetEvents {
    events {
      id
      eventId
      name
      description
      startDate
      endDate
      temporalCoverage
      sameAs
    }
  }
`;

export const GET_SOURCE_REFS = gql`
  query GetSourceRefs {
    sourceRefs {
      id
      sourceRefId
      path
      lang
      selectionHint
    }
  }
`;

export const GET_OCCUPATIONS = gql`
  query GetOccupations {
    occupations {
      id
      occupationId
      name
      description
    }
  }
`;

export const GET_SETTINGS = gql`
  query GetSettings {
    settings {
      id
      settingId
      name
      description
      ghostType
    }
  }
`;

export const GET_GRAPH_LINKS = gql`
  query GetGraphLinks {
    graphLinks {
      id
      sourceNodeType
      sourceNodeId
      targetNodeType
      targetNodeId
      linkType
      properties
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRAPH_LINKS_FOR_NODE = gql`
  query GetGraphLinksForNode($nodeType: String!, $nodeId: ID!) {
    graphLinksForNode(nodeType: $nodeType, nodeId: $nodeId) {
      id
      sourceNodeType
      sourceNodeId
      targetNodeType
      targetNodeId
      linkType
      properties
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRAPH_INCIDENCES = gql`
  query GetGraphIncidences {
    graphIncidences {
      id
      nodeType
      nodeId
      linkId
      role
      properties
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRAPH_INCIDENCES_FOR_LINK = gql`
  query GetGraphIncidencesForLink($linkId: ID!) {
    graphIncidencesForLink(linkId: $linkId) {
      id
      nodeType
      nodeId
      linkId
      role
      properties
      createdAt
      updatedAt
    }
  }
`;

