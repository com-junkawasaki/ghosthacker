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
      created_at
      updated_at
      chapters {
        id
        title
        order
        content_html
        media {
          id
          type
          url
          mime_type
          file_size
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
      created_at
      updated_at
    }
  }
`;

export const GET_CHAPTER = gql`
  query GetChapter($id: ID!) {
    chapter(id: $id) {
      id
      title
      order
      content_html
      paragraphs {
        id
        order
        content_html
      }
      media {
        id
        type
        url
        mime_type
        file_size
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
      content_html
    }
  }
`;

