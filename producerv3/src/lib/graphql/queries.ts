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

